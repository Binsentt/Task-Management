import * as taskService from './task.service.js';

// The service already returns { status, data, message } from createResponse
const send = (res, result) => res.status(result.status).json(result);

// GET /api/tasks?page=1&limit=20&status=TO_DO
export async function getTasks(req, res) {
    const { page, limit, status } = req.query;
    return send(res, await taskService.getTasks(req.user, { page, limit, status }));
}

export async function getOrganizationCompletion(req, res) {
    return send(res, await taskService.getOrganizationCompletion(req.user));
}

// GET /api/tasks/:id
export async function getTask(req, res) {
    return send(res, await taskService.getOneTask(req.user, req.params.id));
}

// POST /api/tasks
export async function createTask(req, res) {
    return send(res, await taskService.addTask(req.user, req.body));
}

// PATCH /api/tasks/:id
export async function updateTask(req, res) {
    return send(res, await taskService.updateTask(req.user, req.params.id, req.body));
}

// DELETE /api/tasks/:id (soft delete)
export async function deleteTask(req, res) {
    return send(res, await taskService.deleteTask(req.user, req.params.id));
}