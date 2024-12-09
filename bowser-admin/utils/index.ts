export const updateDriverMobile = async (driverId: string, driverMobile: string) => {
    try {
        const response = await fetch('https://bowser-backend-2cdr.onrender.com/searchDriver/updateDriverMobile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ driverId, driverMobile }),
        });

        if (!response.ok) {
            throw new Error(`Failed to update driver mobile number: ${response.status}`);
        }

        const result = await response.json();
        return result.message;
    } catch (error) {
        console.error('Error updating driver mobile number:', error);
        throw error;
    }
};