import * as remoteShiftService from './remoteshift.service.js';

const send = (res, result) => res.status(result.status).json(result);

export async function clockIn(req, res) {
    return send(res, await remoteShiftService.clockIn(req.user, req.body));
}

export async function clockOut(req, res) {
    return send(res, await remoteShiftService.clockOut(req.user, req.body));
}

export async function getShifts(req, res) {
    return send(res, await remoteShiftService.getShifts(req.user, req.query));
}

export async function correctShift(req, res) {
    return send(res, await remoteShiftService.correctShift(req.user, req.params.shiftId, req.body));
}
