const express = require("express");
const bodyParser = require("body-parser");
const sql = require("msnodesqlv8");
const session = require("express-session");
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret:
      "d91a0a04e7e56d47b13335b72565e9d1a89ce2d36faa4094292137ce5ae7ee58",
    resave: false,
    saveUninitialized: false,
  })
);

const sqlConnectionString =
  "Driver={SQL Server};Server=103.190.54.22\\SQLEXPRESS,1633;Database=hrms_app;Uid=ecohrms;Pwd=EcoHrms@123;";

// Serve the HTML form
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/register.html");
});

// Function to generate a random alphanumeric key
function generateRandomKey(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    key += characters.charAt(randomIndex);
  }

  return key;
}

// Function to update the status of the previous registration key to inactive
function updatePreviousRegistrationKeyStatus(userid, callback) {
  const updateRegistrationKeyQuery = `UPDATE ecohrms.RegistrationKeys SET status='inactive' WHERE userid='${userid}' AND status='active'`;

  sql.query(sqlConnectionString, updateRegistrationKeyQuery, (error, results) => {
    if (error) {
      console.error("Error updating registration key status:", error);
      callback(error);
    } else {
      callback(null);
    }
  });
}

// Function to save the new registration key as a new entry
function saveNewRegistrationKey(userid, registrationKey, callback) {
  const insertRegistrationKeyQuery = `INSERT INTO ecohrms.RegistrationKeys (userid, registrationKey, status) VALUES (?, ?, 'active')`;
  const registrationKeyValues = [userid, registrationKey];

  sql.query(
    sqlConnectionString,
    insertRegistrationKeyQuery,
    registrationKeyValues,
    (error, results) => {
      if (error) {
        console.error("Error saving registration key:", error);
        callback(error);
      } else {
        callback(null);
      }
    }
  );
}

// Registration API endpoint
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

app.delete("/Emp/:userid", (req, res) => {
  const userid = req.params.userid;

  console.log("Received delete request for userid:", userid);

  const query = `DELETE FROM ecohrms.RegistrationKeys WHERE userid='${userid}'`;
  console.log("Delete query:", query);

  sql.query(sqlConnectionString, query, (err, result) => {
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

// Start the server
app.listen(3000, () => {
  console.log("Server listening on port 3000");
});