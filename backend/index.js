const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { connectDatabases } = require('./config/database');
const routes = require('./src/routes');
const bowserAdminAuth = require('./src/routes/bowserAdminAuth');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/', routes);
app.use('/auth/admin', bowserAdminAuth);
// Start server after database connections are established
connectDatabases()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on the backend url, restarted at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    });
  })
  .catch(error => {
    console.error('Failed to connect to databases:', error);
    process.exit(1);
  });

  // const fetchLocationData = async (latitude, longitude) => {
  //   const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
    
  //   try {
  //     const response = await fetch(url);
  //     const data = await response.json();
  //     if (data && data.address) {
  //       const { county: state_district, state, city, town, village } = data.address;
  //       const location = city || town || village;
  //       let obj = `${location}, ${data.address.state_district}, ${state}`
  //       return obj
  //     } else {
  //       console.log("No results found");
  //       return null;
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     return null;
  //   }
  // };
  
  // Example usage
  // fetchLocationData(26.7474572, 83.2323794).then(console.log);