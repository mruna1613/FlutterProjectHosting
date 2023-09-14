const express = require("express");
const ngrok = require("ngrok");
const sql = require("msnodesqlv8");
const session = require("express-session");
const app = express();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

// const{server}=require('ws');
// const sss = new server({server});
// wss.on('connection',ws=>{
//   console.log('client connected');
//   ws.send(JSON.stringify({'message':'hello'}));
//   })
//   app.use("/static", express.static(__dirname + "/main.dart"));


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Add session middleware
app.use(
  session({
    secret: "d91a0a04e7e56d47b13335b72565e9d1a89ce2d36faa4094292137ce5ae7ee58",
    resave: false,
    saveUninitialized: true,
  })
);
const connectionString =
  "Driver={SQL Server};Server=103.190.54.22\\SQLEXPRESS,1633;Database=hrms_app;Uid=ecohrms;Pwd=EcoHrms@123;";


app.use(express.static("mssqlserver"));
// Function to generate a random key of specified length
function generateRandomKey(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");//flutter_hrms/flutter_application_1/lib/main.dart
});

app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/register.html");//flutter_hrms/flutter_application_1/lib/main.dart
});

app.post("/login", (req, res) => {
  const { userid, password, RegistrationKey } = req.body;

  const checkKeyQuery = `SELECT status FROM ecohrms.RegistrationKeys WHERE userid='${userid}' AND RegistrationKey='${RegistrationKey}'`;

  sql.query(connectionString, checkKeyQuery, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("An error occurred");
    }

    if (results.length === 1) {
      const keyStatus = results[0].status.trim();

      if (keyStatus === 'D') {
        return res.status(401).send("Your account is deactivated");
      } else if (keyStatus === 'R' || keyStatus === 'A') {
        const checkUserQuery = `SELECT * FROM ecohrms.userdata WHERE userid='${userid}' AND status='${keyStatus}'`;

        sql.query(connectionString, checkUserQuery, (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).send("An error occurred");
          }

          if (results.length === 1) {
            const user = results[0];
            const storedPassword = user.password;
            const inputPassword = password;

            // Compare hashed password
            bcrypt.compare(inputPassword, storedPassword, (bcryptErr, isMatch) => {
              if (bcryptErr) {
                console.error(bcryptErr);
                return res.status(500).send("An error occurred");
              }

              if (isMatch) {
                // Set the session variables
                req.session.isLoggedIn = true;
                req.session.userid = userid;

                console.log("Login successful for user:", userid);
                return res.send("Login successful");
              } else {
                console.log("Invalid password for user:", userid);
                return res.status(401).send("Invalid Credentials!");
              }
            });
          } else {
            console.log("Invalid username or inactive account for user:", userid);
            return res.status(401).send("Invalid Credentials!");
          }
        });
      }
    } else {
      console.log("Invalid registration key or user ID:", userid);
      return res.status(401).send("Invalid Credentials!");
    }
  });
});

// Add the /register endpoint
app.post("/register", (req, res) => {
  const { userid, email, password } = req.body;

  // Generate a new registration key
  const newRegistrationKey = generateRandomKey(10);

  // Hash the user's password
  bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
    if (hashErr) {
      console.error("Error hashing password:", hashErr);
      return res.status(500).send("An error occurred while hashing the password");
    }

    // Continue with registration after hashing the password
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "rutuja.22110140@viit.ac.in",
        pass: "zalpwsjzrxksvslk",
      },
    });

    // Define the email message
    const mailOptions = {
      from: "rutuja.22110140@viit.ac.in",
      to: email,
      subject: "Registration Key",
      text: `Your registration key is: ${newRegistrationKey}`,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).send("An error occurred while sending the email");
      }

      // Store the new registration key and hashed password in the database
      const insertRegistrationKeyQuery = `INSERT INTO ecohrms.RegistrationKeys (userid, registrationKey, status) VALUES (?, ?, 'R')`;
      const registrationKeyValues = [userid, newRegistrationKey];

      sql.query(connectionString, insertRegistrationKeyQuery, registrationKeyValues, (keyErr, keyResult) => {
        if (keyErr) {
          console.error(keyErr);
          return res.status(500).send("An error occurred");
        }

        // Now, store the user details in ecohrms.userdata with hashed password
        const insertUserQuery = "INSERT INTO ecohrms.userdata (userid, email, password, status) VALUES (?, ?, ?, 'R')";
        const userValues = [userid, email, hashedPassword]; // Store the hashed password

        sql.query(connectionString, insertUserQuery, userValues, (insertErr, insertResult) => {
          if (insertErr) {
            console.error(insertErr);
            return res.status(500).send("An error occurred");
          }

          // Send the registration key as a JSON response
          res.json({ registrationKey: newRegistrationKey });
        });
      });
    });
  });
});




//get all data
app.get("/data", (req, res) => {
  const query = "SELECT * FROM ecohrms.userdata";
  sql.query(connectionString, query, (err, rows) => {
    if (err) {
      console.log(err);
      res.status(500).send("An error occurred");
    } else {
      res.send(rows);
    }
  });
});

//get specific user 
app.get("/Emp/:userid", (req, res) => {
  const userid = req.params.userid;

  const query = `SELECT * FROM ecohrms.userdata WHERE userid='${userid}'`;
  sql.query(connectionString, query, (err, rows) => {
    if (err) {
      console.log(err);
      res.status(500).send("An error occurred");
    } else if (rows.length > 0) {
      res.send(rows[0]);
    } else {
      res.status(404).send("No matching user found");
    }
  });
});

//from userid he/she from which city
app.get("/Emp/:userid/city", (req, res) => {
  const userid = req.params.userid;

  const query = `SELECT city FROM ecohrms.userdata WHERE userid='${userid}'`;
  sql.query(connectionString, query, (err, rows) => {
    if (err) {
      console.log(err);
      res.status(500).send("An error occurred");
    } else if (rows.length > 0) {
      res.send(rows[0].city);
    } else {
      res.status(404).send("No matching user found");
    }
  });
});


//retrieves the desired column from the table
app.get("/Emp/column/:columnName", (req, res) => {
  const columnName = req.params.columnName;

  const query = `SELECT ${columnName} FROM ecohrms.userdata`;
  sql.query(connectionString, query, (err, rows) => {
    if (err) {
      console.log(err);
      res.status(500).send("An error occurred");
    } else if (rows.length > 0) {
      const columnData = rows.map(row => row[columnName]);
      res.send(columnData);
    } else {
      res.status(404).send("No data found");
    }
  });
});

//the user IDs but also all data for users based on the city
app.get("/Emp/city/:city", (req, res) => {
  const city = req.params.city;

  const query = `SELECT * FROM ecohrms.userdata WHERE city='${city}'`;
  sql.query(connectionString, query, (err, rows) => {
    if (err) {
      console.log(err);
      res.status(500).send("An error occurred");
    } else if (rows.length > 0) {
      res.send(rows);
    } else {
      res.status(404).send("No matching users found");
    }
  });
});


//Check if userid already exists
app.post("/Emp", (req, res) => {
  const { userid, email, password, city } = req.body;
  const checkQuery = `SELECT * FROM ecohrms.userdata WHERE userid='${userid}'`;
  sql.query(connectionString, checkQuery, (err, rows) => {
    if (err) {
      console.log(err);
      res.status(500).send("An error occurred");
    } else if (rows.length > 0) {
      res.status(409).send("User already exists");
    } else {
      // Insert the new user
      const query = `INSERT INTO ecohrms.userdata (userid, email, password, city) VALUES ('${userid}', '${email}', '${password}', '${city}')`;
  sql.query(connectionString, query, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("An error occurred");
    } else {
      res.send("Data inserted successfully");
    }
  });
    }
  });
});

// Update data
app.put("/Emp/:userid", (req, res) => {
  const userid = req.params.userid;
  const { email, password, city, status } = req.body;

  console.log("Received update request for userid:", userid);
  console.log("Updated email:", email);
  console.log("Updated password:", password);
  console.log("Updated city:", city);
  console.log("Updated status:", status);

  let updateQuery = "UPDATE ecohrms.userdata SET ";
  const updateParams = [];

  if (email) {
    updateQuery += "email=?, ";
    updateParams.push(email);
  }
  if (password) {
    updateQuery += "password=?, ";
    updateParams.push(password);
  }
  if (city) {
    updateQuery += "city=?, ";
    updateParams.push(city);
  }
  if (typeof status !== "undefined") {
    updateQuery += "status=?, ";
    updateParams.push(status);
  }

  // Remove the trailing comma and space from the query
  updateQuery = updateQuery.slice(0, -2);

  // Add the WHERE clause to update only the specific user
  updateQuery += " WHERE userid = ?";

  // Add the userid parameter to updateParams array
  updateParams.push(userid);

  console.log("Update query:", updateQuery);

  sql.query(connectionString, updateQuery, updateParams, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("An error occurred");
    } else {
      console.log("Update successful");
      res.send("Data updated successfully");
    }
  });
});



//delete data
app.delete("/Emp/:userid", (req, res) => {
  const userid = req.params.userid;

  console.log("Received delete request for userid:", userid);

  const query = `DELETE FROM ecohrms.userdata WHERE userid='${userid}'`;
  console.log("Delete query:", query);

  sql.query(connectionString, query, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("An error occurred");
    } else if (result.rowsAffected > 0) {
      console.log("Delete successful");
      res.send("Data deleted successfully");
    } else {
      console.log("No matching user found");
      res.status(404).send("No matching user found");
    }
  });
});


const server = app.listen(3009, () => {
  console.log("Server listening on port 3009");
  
  // Start ngrok to expose the server
  (async () => {
    try {
      const ngrokUrl = await ngrok.connect({
        addr: 3009, // Your server is running on port 3009
        authtoken: '2TyMw9yoVVPNgKzPYLYEMRvmdjT_7W6vh74gxnftaGMwcTUYD', // Replace with your ngrok auth token
        region: 'us', // Choose a region
      });
      console.log("Ngrok URL:", ngrokUrl);
    } catch (error) {
      console.error("Error starting ngrok:", error);
    }
  })();
});