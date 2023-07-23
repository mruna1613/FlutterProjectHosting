// const express = require("express");
// const bodyParser = require("body-parser");
// const sql = require("msnodesqlv8");
// const session = require("express-session");

// const app = express();

// // Middleware
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());
// app.use(session({
//   secret: "d91a0a04e7e56d47b13335b72565e9d1a89ce2d36faa4094292137ce5ae7ee58",
//   resave: false,
//   saveUninitialized: false
// }));

// const sqlConnectionString =
//   "Driver={SQL Server};Server=103.190.54.22\\SQLEXPRESS,1633;Database=hrms_app;Uid=ecohrms;Pwd=EcoHrms@123;";

// // Serve the HTML form
// app.get("/", (req, res) => {
//   res.sendFile(__dirname + "/register.html");
// });

// // Function to generate a random alphanumeric key
// function generateRandomKey(length) {
//   const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   let key = "";

//   for (let i = 0; i < length; i++) {
//     const randomIndex = Math.floor(Math.random() * characters.length);
//     key += characters.charAt(randomIndex);
//   }

//   return key;
// }

// // Registration API endpoint
// app.post("/register", (req, res) => {
//   const { userid, email, password } = req.body;

//   // Check if the user already exists
//   const checkUserQuery = `SELECT COUNT(*) AS count FROM ecohrms.data WHERE userid='${userid}'`;

//   sql.query(sqlConnectionString, checkUserQuery, (error, results) => {
//     if (error) {
//       console.error("Error checking user:", error);
//       res.status(500).json({ error: "Internal server error" });
//     } else {
//       const userCount = results[0].count;

//       if (userCount > 0) {
//         // User already exists, generate a new registration key and update it in the database
//         const newRegistrationKey = generateRandomKey(10);
//         const updateRegistrationKeyQuery = `UPDATE ecohrms.RegistrationKeys SET registrationKey='${newRegistrationKey}' WHERE userid='${userid}'`;
        
//         sql.query(sqlConnectionString, updateRegistrationKeyQuery, (error, updateResults) => {
//             if (error) {
//               console.error("Error updating registration key:", error);
//               res.status(500).json({ error: "Internal server error" });
//             } else {
//               // Insert a new row into the RegistrationKeys table with the new registration key
//               const insertRegistrationKeyQuery = `INSERT INTO ecohrms.RegistrationKeys (userid, registrationKey) VALUES (?, ?)`
//               const registrationKeyValues = [userid, newRegistrationKey];
//               sql.query(sqlConnectionString, insertRegistrationKeyQuery, registrationKeyValues, (error, keyResults) => {
//                 if (error) {
//                   console.error("Error storing registration key in ecohrms.RegistrationKeys:", error);
//                   res.status(500).json({ error: "Internal server error" });
//                 } else {
//                   res.json({ registrationKey: newRegistrationKey });
//                 }
//               });
//             }
//           });
//         } else {
//           // Generate a registration key
//           const registrationKey = generateRandomKey(10);
      
//           // Store the user details in the ecohrms.data table
//           const insertUserQuery = "INSERT INTO ecohrms.data (userid, email, password) VALUES (?, ?, ?)";
//           const userValues = [userid, email, password];
      
//           sql.query(sqlConnectionString, insertUserQuery, userValues, (error, userResults) => {
//             if (error) {
//               console.error("Error storing user details in ecohrms.data:", error);
//               res.status(500).json({ error: "Internal server error" });
//             }else {
//                 // Store the registration key in the ecohrms.RegistrationKeys table
//                 const insertRegistrationKeyQuery = "INSERT INTO ecohrms.RegistrationKeys (userid, registrationKey) VALUES (?, ?)";
//                 const registrationKeyValues = [userid, registrationKey];
    
//                 sql.query(sqlConnectionString, insertRegistrationKeyQuery, registrationKeyValues, (error, keyResults) => {
//                   if (error) {
//                     console.error("Error storing registration key in ecohrms.RegistrationKeys:", error);
//                     res.status(500).json({ error: "Internal server error" });
//                   } else {
//                     res.send("Registration successful");
//                   }
//                 });
//               }
//             });
//           }
//         }
//       });
//     });
    
    
//     app.delete("/Emp/:userid", (req, res) => {
//       const userid = req.params.userid;
    
//       console.log("Received delete request for userid:", userid);
    
//       const query = `DELETE FROM ecohrms.RegistrationKeys WHERE userid='${userid}'`;
//       console.log("Delete query:", query);
    
//       sql.query(sqlConnectionString, query, (err, result) => {
//         if (err) {
//           console.log(err);
//           res.status(500).send("An error occurred");
//         } else if (result.rowsAffected > 0) {
//           console.log("Delete successful");
//           res.send("Data deleted successfully");
//         } else {
//           console.log("No matching user found");
//           res.status(404).send("No matching user found");
//         }
//       });
//     });
    
//     // Start the server
//     app.listen(3000, () => {
//       console.log("Server listening on port 3000");
//     });

const express = require("express");
const sql = require("msnodesqlv8");
const session = require("express-session");
const app = express();
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Add session middleware
app.use(session({
  secret: "d91a0a04e7e56d47b13335b72565e9d1a89ce2d36faa4094292137ce5ae7ee58",
  resave: false,
  saveUninitialized: true
}));

const connectionString =
  "Driver={SQL Server};Server=103.190.54.22\\SQLEXPRESS,1633;Database=hrms_app;Uid=ecohrms;Pwd=EcoHrms@123;";

// ... (Other routes and middleware) ...

// Assuming there's a foreign key relationship between userdata and RegistrationKeys tables,
// we can update userdata status based on the latest status in RegistrationKeys table.
app.post("/updateStatus/:userid", (req, res) => {
  const userid = req.params.userid;

  // Query to get the latest status from RegistrationKeys table based on the userid
  const registrationQuery = `SELECT TOP 1 status FROM RegistrationKeys WHERE userid='${userid}' ORDER BY createdAt DESC`;

  sql.query(connectionString, registrationQuery, (regErr, regRows) => {
    if (regErr) {
      console.log(regErr);
      return res.status(500).send("An error occurred while fetching the latest status.");
    }

    if (regRows.length === 0) {
      return res.status(404).send("No matching user found in RegistrationKeys.");
    }

    const latestStatus = regRows[0].status;

    // Query to update the userdata table with the latest status
    const updateQuery = `UPDATE ecohrms.userdata SET status='${latestStatus}' WHERE userid='${userid}'`;

    sql.query(connectionString, updateQuery, (updateErr, updateResult) => {
      if (updateErr) {
        console.log(updateErr);
        return res.status(500).send("An error occurred while updating userdata status.");
      }

      if (updateResult.rowsAffected > 0) {
        return res.send(`Status updated successfully for user: ${userid}`);
      } else {
        return res.status(404).send("No matching user found in userdata.");
      }
    });
  });
});

app.listen(3009, () => {
  console.log("Server listening on port 3009");
});
