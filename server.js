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

  app.get("/", (req, res) => {
    res.sendFile(__dirname + "/login.html");
  });
  
  app.post("/login", (req, res) => {
    const { userid, password } = req.body;
  
    const check = `SELECT * FROM ecohrms.userdata WHERE userid='${userid}'`;
    console.log("QUERY", check);
    sql.query(connectionString,check,(err,results)=>{
      if(err){
        console.log(err);
        return res.status(500).send("An error occured");
      }
      console.log("Data :",results);
    });
  
    const query = `SELECT TRIM(password) AS password, TRIM(status) AS status FROM ecohrms.data WHERE userid='${userid}'`;
    console.log("Login query:", query);
  
    sql.query(connectionString, query, (err, rows) => {
      if (err) {
        console.log(err);
        return res.status(500).send("An error occurred");
      }
      console.log("Rows:", rows);
  
      if (rows.length === 1) {
        const user = rows[0];
        const status = user.status;
  
        console.log("User status:", status);
  
        switch (status) {
          case "inactive":
            return res.status(401).send("Your account is inactive");
          case "invalid":
            return res.status(401).send("Invalid Credentials!");
          case "disabled":
            return res.status(401).send("Your account is disabled");
          case "active":
            const storedPassword = user.password.trim();
            const inputPassword = password.trim();
  
            console.log("Stored password:", storedPassword);
            console.log("Input password:", inputPassword);
  
            if (storedPassword === inputPassword) {
              // Set the session variables
              req.session.isLoggedIn = true;
              req.session.userid = userid;
              console.log("Login successful for user:", userid);
              return res.send("Login successful");
            } else {
              console.log("Invalid password for user:", userid);
              return res.status(401).send("Invalid Credentials!");
            }
          default:
            console.log("Invalid username or password for user:", userid);
            console.log("Status value:", status); // Add this line to print the status value
            return res.status(401).send("Invalid Credentials!");
        }
      }
  
      console.log("Invalid username or password for user:", userid);
      return res.status(401).send("Invalid Credentials!");
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


app.post("/register", (req, res) => {
  const { userid, email, password } = req.body;

  // Check if the user already exists in ecohrms.userdata
  const checkUserQuery = `SELECT COUNT(*) AS count FROM ecohrms.userdata WHERE userid='${userid}'`;

  sql.query(sqlConnectionString, checkUserQuery, (error, results) => {
    if (error) {
      console.error("Error checking user:", error);
      res.status(500).json({ error: "Internal server error" });
    } else {
      const userCount = results[0].count;

      if (userCount > 0) {
        // User already exists, generate a new unique registration key
        const newRegistrationKey = generateRandomKey(10);

        // Update the status of the previous registration key to 'inactive' in ecohrms.RegistrationKeys
        const updatePreviousKeyStatusQuery = `UPDATE ecohrms.RegistrationKeys SET status='inactive' WHERE userid='${userid}' AND status='active'`;

        sql.query(sqlConnectionString, updatePreviousKeyStatusQuery, (error, results) => {
          if (error) {
            console.error("Error updating previous registration key status in ecohrms.RegistrationKeys:", error);
            return res.status(500).json({ error: "Internal server error" });
          }

          // Update the user status in ecohrms.userdata to 'inactive'
          const updateUserStatusQuery = `UPDATE ecohrms.userdata SET status='inactive' WHERE userid='${userid}'`;

          sql.query(sqlConnectionString, updateUserStatusQuery, (error, results) => {
            if (error) {
              console.error("Error updating user status in ecohrms.userdata:", error);
              return res.status(500).json({ error: "Internal server error" });
            }

            // Save the new registration key in ecohrms.RegistrationKeys with status 'active'
            const insertRegistrationKeyQuery = `INSERT INTO ecohrms.RegistrationKeys (userid, registrationKey, status) VALUES (?, ?, 'active')`;
            const registrationKeyValues = [userid, newRegistrationKey];

            sql.query(sqlConnectionString, insertRegistrationKeyQuery, registrationKeyValues, (error, results) => {
              if (error) {
                console.error("Error saving registration key in ecohrms.RegistrationKeys:", error);
                return res.status(500).json({ error: "Internal server error" });
              }

              // Update the user status in ecohrms.userdata to 'active'
              const updateUserStatusQuery = `UPDATE ecohrms.userdata SET status='active' WHERE userid='${userid}'`;

              sql.query(sqlConnectionString, updateUserStatusQuery, (error, results) => {
                if (error) {
                  console.error("Error updating user status in ecohrms.userdata:", error);
                  return res.status(500).json({ error: "Internal server error" });
                }

                res.json({ registrationKey: newRegistrationKey });
              });
            });
          });
        });
      } else {
        // User does not exist, generate a registration key
        const registrationKey = generateRandomKey(10);

        // Store the user details in ecohrms.userdata
        const insertUserQuery =
          "INSERT INTO ecohrms.userdata (userid, email, password, status) VALUES (?, ?, ?, 'active')";
        const userValues = [userid, email, password];

        sql.query(
          sqlConnectionString,
          insertUserQuery,
          userValues,
          (error, userResults) => {
            if (error) {
              console.error("Error storing user details in ecohrms.userdata:", error);
              res.status(500).json({ error: "Internal server error" });
            } else {
              // Save the new registration key in ecohrms.RegistrationKeys with status 'active'
              const insertRegistrationKeyQuery = `INSERT INTO ecohrms.RegistrationKeys (userid, registrationKey, status) VALUES (?, ?, 'active')`;
              const registrationKeyValues = [userid, registrationKey];

              sql.query(sqlConnectionString, insertRegistrationKeyQuery, registrationKeyValues, (error, results) => {
                if (error) {
                  console.error("Error saving registration key in ecohrms.RegistrationKeys:", error);
                  return res.status(500).json({ error: "Internal server error" });
                }

                res.send("Registration successful");
              });
            }
          }
        );
      }
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

app.listen(3009, () => {
  console.log("Server listening on port 3009");
});