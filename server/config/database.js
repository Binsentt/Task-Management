import { connect } from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export default function connectDatabase() {
    connect(process.env.MONGO_URL, {
    })
    .then(() => console.log(('Database Connected Successfully')))
    .catch((error) => {
        console.log(('Database Connection Filed'))
        process.exit(1);
    })
}