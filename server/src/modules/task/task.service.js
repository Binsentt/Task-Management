import Task from './task.model';
import createResponse from '../../utils/response';


async function getOneTask(id) {
    try {
        const data = await Task.findById(id);

        if (data === null) {
            return createResponse(404, null, 'Failed to find task');
        }
        return createResponse(200, data, 'found task successful');


    } catch (error) {
        return createResponse(500, null, 'internal server error');

    }
}

async function getAllTasksByUser(user_id) {
    try {
        const data = await Task.find({ 'created_by': user_id })
        return createResponse(200, data, 'found task successful');

    } catch (error) {
        return createResponse(500, null, 'internal server error');
    }
}


async function addTask(body) {
    try {
        const task = {
            title: body.title,
            content: body.content,
            created_by: body.user_id,
            status: body.status,
        }

        const data = await Task.create(task);
        return createResponse(201, data, 'Task created successfully')

    } catch (error) {
        return createResponse(500, null, 'internal server error');
    }


}

async function updateTask(body) {
    try {
        const task = {
            title: body.title,
            content: body.content,
            created_by: body.user_id,
            status: body.status,
            completed_at: body.completed_at
        }
        const taskToUpdate = await Task.findById(body.id);
        if (taskToUpdate === null) {
            return createResponse(404, null, 'unable to find task')
        }


        taskToUpdate.title = task.title;
        taskToUpdate.content = task.content;
        taskToUpdate.status = task.status;
        taskToUpdate.completed_at = task.completed_at;

        await taskToUpdate.save();
        return createResponse(200, taskToUpdate, 'Task updated successfully')

    } catch (error) {
        return createResponse(500, null, 'internal server error');
    }


}

async function deleteTask(id) {
    try {
        const data = await Task.findByIdAndDelete(id);
        if (data === null) {
            return createResponse(404, null, 'unable to find task')
        }
        return createResponse(200, data, 'Task deleted successfully');

    } catch (error) {
        return createResponse(500, null, 'internal server error');
    }

}