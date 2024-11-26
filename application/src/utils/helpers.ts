import axios from "axios"

export const getAppUpdate = async () => {
    try {
        let response = await axios.get("https://bowser-backend-2cdr.onrender.com/updates") //http://192.168.137.1:5000
        return response.data
    } catch (error) {
        console.log(error)
    }
}