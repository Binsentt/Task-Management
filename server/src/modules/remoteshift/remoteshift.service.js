import RemoteShift from './remoteshift.model.js';
import Task from '../task/task.model.js';
import Organization from '../organization/organization.model.js';
import createResponse from '../../utils/response.js';
import { emitRealtimeEvent } from '../../realtime/events.js';

const isManager = (user) => ['MANAGER', 'ADMIN'].includes(user.org_role);

function handleError(error) {
    if (error.code === 11000) return createResponse({ status: 409, message: 'You already have an open shift' });
    if (error.name === 'ValidationError' || error.name === 'CastError') {
        const message = error.name === 'CastError'
            ? 'Invalid id'
            : Object.values(error.errors).map((item) => item.message).join(', ');
        return createResponse({ status: 400, message });
    }
    console.error(error);
    return createResponse({ status: 500, message: 'Internal server error' });
}

function requireOrganization(user) {
    return user.organization
        ? null
        : createResponse({ status: 403, message: 'You must belong to an organization' });
}

async function validateTask(taskId, organization) {
    if (!taskId) return null;
    return Task.findOne({ _id: taskId, organization, deleted_at: null });
}

export async function clockIn(user, data) {
    try {
        const denied = requireOrganization(user);
        if (denied) return denied;
        if (data.task && !await validateTask(data.task, user.organization)) {
            return createResponse({ status: 400, message: 'Task does not belong to this organization' });
        }
        const shift = await RemoteShift.create({
            user: user._id,
            organization: user.organization,
            task: data.task || null,
            note: data.note || '',
            time_in: data.time_in || new Date()
        });
        emitRealtimeEvent(user.organization, 'shift:update', shift);
        return createResponse({ status: 201, data: shift, message: 'Clocked in successfully' });
    } catch (error) {
        return handleError(error);
    }
}

export async function clockOut(user, data = {}) {
    try {
        const denied = requireOrganization(user);
        if (denied) return denied;
        const shift = await RemoteShift.findOne({ user: user._id, organization: user.organization, time_out: null });
        if (!shift) return createResponse({ status: 404, message: 'No open shift found' });
        shift.time_out = data.time_out || new Date();
        if (data.note !== undefined) shift.note = data.note;
        await shift.save();
        emitRealtimeEvent(user.organization, 'shift:update', shift);
        return createResponse({ status: 200, data: shift, message: 'Clocked out successfully' });
    } catch (error) {
        return handleError(error);
    }
}

export async function getShifts(user, { page = 1, limit = 20, userId } = {}) {
    try {
        const denied = requireOrganization(user);
        if (denied) return denied;
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const filter = { organization: user.organization };
        if (!isManager(user) || userId) filter.user = userId || user._id;
        const [organization, shifts, total] = await Promise.all([
            Organization.findById(user.organization).select('settings.max_shift_hours').lean(),
            RemoteShift.find(filter)
                .sort({ time_in: -1 })
                .skip((safePage - 1) * safeLimit)
                .limit(safeLimit)
                .populate('user', 'username email')
                .populate('task', 'title'),
            RemoteShift.countDocuments(filter)
        ]);
        const maxShiftMs = (organization?.settings?.max_shift_hours || 12) * 60 * 60 * 1000;
        const data = shifts.map((shift) => ({
            ...shift.toJSON(),
            is_overlong: !shift.time_out && Date.now() - shift.time_in.getTime() > maxShiftMs
        }));
        return createResponse({
            status: 200,
            data: { shifts: data, total, page: safePage, pages: Math.ceil(total / safeLimit) },
            message: 'Shifts found'
        });
    } catch (error) {
        return handleError(error);
    }
}

export async function correctShift(user, shiftId, data) {
    try {
        const denied = requireOrganization(user);
        if (denied) return denied;
        if (!isManager(user)) return createResponse({ status: 403, message: 'Insufficient permissions' });
        const shift = await RemoteShift.findOne({ _id: shiftId, organization: user.organization });
        if (!shift) return createResponse({ status: 404, message: 'Shift not found' });
        if (data.task !== undefined && data.task && !await validateTask(data.task, user.organization)) {
            return createResponse({ status: 400, message: 'Task does not belong to this organization' });
        }
        if (data.time_in !== undefined) shift.time_in = data.time_in;
        if (data.time_out !== undefined) shift.time_out = data.time_out;
        if (data.note !== undefined) shift.note = data.note;
        if (data.task !== undefined) shift.task = data.task;
        shift.edited_by = user._id;
        await shift.save();
        emitRealtimeEvent(user.organization, 'shift:update', shift);
        return createResponse({ status: 200, data: shift, message: 'Shift corrected successfully' });
    } catch (error) {
        return handleError(error);
    }
}
