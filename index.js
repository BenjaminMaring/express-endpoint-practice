
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

require('dotenv').config();

const port = process.env.PORT;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3308
});

app.use(async function(req, res, next) {
  try {
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
    await req.db.query(`SET time_zone = '-8:00'`);

    await next();

    req.db.release();
  } catch (err) {
    console.log(err);

    if (req.db) req.db.release();
    throw err;
  }
});

app.use(cors());

app.use(express.json());

app.get('/cars', async function(req, res) {
  try {
    const [data] = await req.db.query(`SELECT id, make, model, year FROM Cars WHERE deleted_flag = false`)
    
    res.json({success: true, data: data})
  } catch (err) {
    console.log(err);
    res.json({success: false, err: err})
  }
});

// app.use(async function(req, res, next) {
//   try {
  
//     await next();

//   } catch (err) {

//   }
// });

app.post('/car', async function(req, res) {
  try {
    const { make, model, year } = req.body;
    const deleted = false;
  
    const query = await req.db.query(
      `INSERT INTO cars (make, model, year, deleted_flag) 
       VALUES (:make, :model, :year, :deleted)`,
      {
        make,
        model,
        year,
        deleted
      }
    );
    res.json({ success: true, message: 'Car successfully created', data: null });
  } catch (err) {
    res.json({ success: false, message: err, data: null })
  }
});

app.delete('/car/:id', async function(req,res) {
  try {
    const { id } = req.params;

    await req.db.query(`UPDATE Cars SET deleted_flag = true WHERE id = :id`, {
        id
    }) 

    res.json({success: true, msg: "successfully deleted"})
  } catch (err) {
    console.log(err);
    res.json({success: false, err: err})
  }
});

app.put('/car', async function(req,res) {
  try {
    //wasnt sure how exactly to handle updating based on the info sent, 
    //assuming that the data/type of data can vary, hopefully this is good
    const {
        id,
        make,
        model,
        year
    } = req.body;
    console.log(1);

    if (!id) {
        res.json({success: false, err: "missing id"});
        return;
    } else if(!make && !model && !year) {
        res.json({success: false, err: "Missing data to update"});
        return;
    }

    let conditions = ""
    if (make) {
        conditions += "make = :make,";
    }
    if (model) {
        conditions += "model = :model,";
    }
    if (year) {
        conditions += "year = :year ";
    }
    
    await req.db.query(`UPDATE Cars SET ${conditions} WHERE id = :id`, {
        id, make, model, year
    })
    
    res.json({success: true});
} catch (err) {
    console.log(err);
    res.json({success: false, err: err});
  }
});


app.listen(port, () => console.log(`Bens test server listening on http://localhost:${port}`));