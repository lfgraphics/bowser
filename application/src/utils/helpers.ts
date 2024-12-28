import axios from "axios"
export const baseUrl = "http://192.168.137.1:5000" //http://192.168.137.1:5000

export const getAppUpdate = async () => {
    try {
        let response = await axios.get(`${baseUrl}/updates`) //http://192.168.137.1:5000
        return response.data
    } catch (error) {
        console.log(error)
    }
}