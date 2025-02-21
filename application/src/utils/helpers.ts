import axios from "axios"
import moment from 'moment';
export const baseUrl = "/https://bowser-backend-2cdr.onrender.com" //http://192.168.137.1:5000 //https://bowser-backend-2cdr.onrender.com

export const getAppUpdate = async () => {
    try {
        let response = await axios.get(`${baseUrl}/updates`) //http://192.168.137.1:5000
        return response.data
    } catch (error) {
        console.log(error)
    }
}

export const formatDate = (dateInput: string | Date): string => {
    const date = moment(dateInput);
    return `${date.format('DD-MM-YY')}, ${date.format('hh:mm A')}`;
};