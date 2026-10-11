import Task from './task.model';
import response from '../../utils/response';


async function getOneTask(id) {
    try {
        const data = await Task.findById(id);

        if (data === null) {
            return response(404,null,'Failed to load task');
        }
        return response(200,data,'found task successful');


    } catch (error) {
        return response(500,null,'internal server error');
        
    }
}

async function getAllTaskByUser(userId) {

}


async function addTask() {  

}

async function updateTask() {

}

async function deleteTask() {
    
}