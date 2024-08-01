const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();
const multer = require("multer");

//set up multer for file uploads 
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);  // Correct the typo: file.originalname instead of file.orginalname
    }
});;

const upload = multer({ storage: storage });

// Set up session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'homeowners_renumate'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');

// Enable static files
app.use(express.static('public'));

// Body parser middleware
app.use(express.urlencoded({ extended: false }));

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.homeownerId) {
        return next();
    } else {
        return res.redirect('/login');
    }
};

// Login route
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM homeowners_table WHERE username = ?';

    connection.query(sql, [username], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error logging in');
        }

        console.log(results[0]);

        if (results.length === 0) {
            return res.status(400).send('Invalid username or password');
        }

        const homeowner = results[0];


        if (password === results[0].password) {
            req.session.homeownerId = homeowner.user_id;
            console.log('Logged in as homeowner:', homeowner.user_id);
            return res.redirect('/');
        } else {
            return res.status(400).send('Invalid username or password');
        }
    });
});

// Protected route
app.get('/', isAuthenticated, (req, res) => {
    const sql = 'SELECT * FROM customers';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving customer data');
        }
        res.render('index', { customers: results });
    });
});

app.get('/customer/:id', (req, res) => {
    const customerID = req.params.id;
    const sql = 'SELECT * FROM customers WHERE customer_id = ?';
    connection.query(sql, [customerID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving customer data');
        }
        res.render('customer', { customer: results[0] });
    });
});


app.get('/addRequest', (req, res) => {
    res.render('addRequest');
});

app.post('/addRequest', (req, res) => {
    const { customer_name, type_of_house, contact, info, due_date } = req.body;
    console.log('Form Data:', req.body); 
    const sql = 'INSERT INTO customers (customer_name, type_of_house, contact, info_reno, due_date) VALUES (?, ?, ?, ?, ?)';
    connection.query(sql, [customer_name, type_of_house, contact, info, due_date], (error, results) => {
        if (error) {
            console.error('Error adding customer request:', error.message);
            return res.status(500).send('Error adding product');
        } else {
            res.redirect('/');
        }
    });
});


app.get('/register', (req, res) => {
    res.render("register");
});


app.post('/register', (req, res) => {
    const { username, password } = req.body;
        
    // SQL query to insert user into homeowners_table
    const sql = 'INSERT INTO homeowners_table (username, password) VALUES (?, ?)';
    connection.query(sql, [username, password], (error, results) => {
        if (error) {
            console.error('Error registering user:', error.message);
            return res.status(500).send('Error registering user');
        }
        console.log('User registered successfully');
        res.redirect('/login'); // Redirect to login page on successful registration
    });
    
});


app.get('/productListing', (req, res) => {
    const sql = 'SELECT * FROM product';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving products');
        }

        res.render('productlisting', { products: results }); // Pass type as well
    });
});
    

app.post('/productListing', (req, res) => {
    const sql = 'SELECT * FROM product';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Error retrieving products:', error.message);
            return res.status(500).send('Error retrieving products');
        }
        res.render('productlisting', { products: results });
    });
});


app.get('/addProduct', (req, res) => {
    res.render('addProduct');
});

app.post('/addProduct', upload.single('image'), (req, res) => {
    const { product_name, type , detail, price } = req.body;
    let image = null;
    if (req.file) {
        image = req.file.filename;
    }

    const sql = 'INSERT INTO product (product_name, type ,detail, price, image) VALUES (?, ?, ?, ?,?)';
    connection.query(sql, [product_name,type, detail, price, image], (error, results) => {
        if (error) {
            console.error('Error adding product:', error.message);
            return res.status(500).send('Error adding product');
        }
        res.redirect('/productListing');
    });
});

app.get('/editRequest/:id', (req, res) => {
    const customerID = req.params.id;
    const sql = 'SELECT * FROM customers WHERE customer_id = ?';
    connection.query(sql, [customerID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving customer data');
        }
        if (results.length > 0) {
            res.render('editRequest', { customer: results[0] });
        } else {
            res.status(404).send('Customer not found');
        }
    });
});


app.post('/editRequest/:id', isAuthenticated, (req, res) => {
    const customerID = req.params.id;
    const { type_of_house, contact, info, due_date } = req.body;
    const sql = 'UPDATE customers SET type_of_house = ?, contact = ?, info = ?, due_date = ? WHERE customer_id = ?';
    connection.query(sql, [type_of_house, contact, info, due_date, customerID], (error, results) => {
        if (error) {
            console.error('Error updating customer:', error.message);
            return res.status(500).send('Error updating customer');
        }
        res.redirect('/');
    });
});

app.get('/deleteRequest/:id', isAuthenticated, (req, res) => {
    const customerID = req.params.id;
    const sql = 'DELETE FROM customers WHERE customer_id = ?';
    connection.query(sql, [customerID], (error, results) => {
        if (error) {
            console.error('Error deleting customer:', error.message);
            return res.status(500).send('Error deleting customer');
        }
        res.redirect('/');
    });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error logging out');
        }
        res.redirect('/login');
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));










