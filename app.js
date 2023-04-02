const express = require("express");
const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const { open } = sqlite;̥
const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;

const PORT = process.env.PORT || 3030;

const initializeDBandServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log("Server Running on Port 3000");
    });
    db = await open({ filename: dbPath, driver: sqlite3.Database });
  } catch (error) {
    console.log(`DB Encountered Error :${e.message}`);
    process.exit(1);
  }
};

initializeDBandServer();

const conversionOfDBObjectToResponseObjectForAPI1 = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const conversionOfDBObjectToResponseObjectForAPI4 = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const conversionOfDBObjectToResponseObjectForAPI7 = (dbObject) => {
  return {
    totalCases: dbObject.totalCases,
    totalCured: dbObject.totalCured,
    totalActive: dbObject.totalActive,
    totalDeaths: dbObject.totalDeaths,
  };
};

const conversionOfDBObjectToResponseObjectForAPI8 = (dbObject) => {
  return {
    stateName: dbObject.state_name,
  };
};

//API for login
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkForUserQuery = `
                            select
                                *
                            from
                                user
                            where 
                                username like '${username}'
                            ;`;
  const usersInDatabase = await db.get(checkForUserQuery);
  //   console.log(usersInDatabase);
  if (usersInDatabase !== undefined) {
    const checkForPasswordMatch = await bcrypt.compare(
      password,
      usersInDatabase.password
    );
    // const checkForPasswordMatch = userDataFromDatabase[0].password === password;
    // console.log(checkForPasswordMatch);
    if (checkForPasswordMatch) {
      const jwtToken = jwt.sign({ username: username }, "THE SECRET KEY");
      //   console.log(jwtToken);
      response.status(200);
      response.send({ jwtToken: jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

//Authenticate User With Token
const authenticateUser = (request, response, next) => {
  const jwtToken = request.headers["authorization"].split(" ")[1];
  console.log(jwtToken);
  if (jwtToken === undefined) {
    // console.log("No Token");
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "THE SECRET KEY", async (error, payload) => {
      if (error) {
        // console.log("error");
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        // console.log("SSS");
        next();
      }
    });
  }
};

// API-1 Get All States

app.get("/states/", authenticateUser, async (request, response) => {
  const getStatesQuery = `
                            select 
                                * 
                            from 
                                state;
                            `;
  const statesArray = await db.all(getStatesQuery);
  const responseStatesArray = statesArray.map((eachState) =>
    conversionOfDBObjectToResponseObjectForAPI1(eachState)
  );
  //   console.log(typeof moviesArray);
  response.send(responseStatesArray);
});

// API-2  Get State with ID
app.get("/states/:stateId/", authenticateUser, async (request, response) => {
  let { stateId } = request.params;
  const getStateQuery = `
                            select
                            *
                            from
                                state
                            where
                                state_id = ${stateId};
                            `;

  const state = await db.get(getStateQuery);
  //   console.log(movie);
  const responseObjectOfState = conversionOfDBObjectToResponseObjectForAPI1(
    state
  );
  //   console.log(player);
  response.send(responseObjectOfState);
});

// API-3 Create New district
app.post("/districts/", authenticateUser, async (request, response) => {
  //   console.log(request.body);
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createNewDistrictQuery = `
                            insert into district 
                            (district_name, state_id, cases, cured, active, deaths) 
                            values ( '${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths} );
                            `;
  const dbResponse = await db.run(createNewDistrictQuery);
  //   console.log(dbResponse);
  response.send("District Successfully Added");
});

// API-4  Get District with ID
app.get(
  "/districts/:districtId/",
  authenticateUser,
  async (request, response) => {
    let { districtId } = request.params;
    const getDistrictQuery = `
                            select
                            *
                            from
                                district
                            where
                                district_id = ${districtId};
                            `;

    const district = await db.get(getDistrictQuery);
    //   console.log(movie);
    const responseObjectOfDistrict = conversionOfDBObjectToResponseObjectForAPI4(
      district
    );
    //   console.log(player);
    response.send(responseObjectOfDistrict);
  }
);

//  API-5 Delete District with ID
app.delete(
  "/districts/:districtId/",
  authenticateUser,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `
                                delete 
                                from
                                district 
                                where district_id = ${districtId};
                                `;
    const dbResponse = await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

//  API-6 Update Existing District
app.put(
  "/districts/:districtId/",
  authenticateUser,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateDistrictQuery = `
                                update district
                                set district_name = '${districtName}', 
                                state_id = ${stateId}, 
                                cases = ${cases},
                                cured = ${cured},
                                active = ${active},
                                deaths = ${deaths} 
                                where district_id = ${districtId};
                              `;
    const dbResponse = await db.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

// API-7  Get Stats with State ID
app.get(
  "/states/:stateId/stats/",
  authenticateUser,
  async (request, response) => {
    let { stateId } = request.params;
    const getStatsQuery = `
                            select
                            sum(cases) as totalCases,
                            sum(cured) as totalCured,
                            sum(active) as totalActive,
                            sum(deaths) as totalDeaths
                            from
                                district
                            where
                                state_id = ${stateId};
                            `;

    const stats = await db.get(getStatsQuery);
    //   console.log(stats);
    const responseObjectOfStats = conversionOfDBObjectToResponseObjectForAPI7(
      stats
    );
    response.send(responseObjectOfStats);
  }
);

// API-8  Get State Name with District ID
app.get(
  "/districts/:districtId/details/",
  authenticateUser,
  async (request, response) => {
    let { districtId } = request.params;
    const getStateQuery = `
                            select
                            *
                            from
                                state natural join district
                            where
                                district_id = ${districtId};
                            limit 1
                            `;

    const state = await db.get(getStateQuery);
    //   console.log(state);
    const responseObjectOfState = conversionOfDBObjectToResponseObjectForAPI8(
      state
    );
    //   console.log(player);
    response.send(responseObjectOfState);
  }
);

module.exports = app;
