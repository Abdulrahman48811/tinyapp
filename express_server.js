const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const cookieParser = require('cookie-parser');
app.set("view engine", "ejs");

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};


const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get('/u/:shortURL', (req, res) => {
  res.redirect(urlDatabase[req.params.shortURL]);
});

app.get('/urls/new', (req, res) => {
  let user_id = req.cookies.user_id;
  const templateVars = { user: users[user_id] };
  res.render('urls_new', templateVars);
});
// app.get('/urls/new', (req, res) => {
//   let id = req.cookies.id;
//   const templateVars = { username: req.cookies.id };
//   res.render('urls_new', templateVars);
// });


app.get('/urls', (req, res) => {
  let user_id = req.cookies.user_id;
  const templateVars = { urls: urlDatabase, user: users[user_id] };
  res.render('urls_index', templateVars);
});

// app.get('/urls', (req, res) => {
//   const templateVars = { urls: urlDatabase, username: req.cookies.id };
//   let id = req.cookies.id;
//   let username = users[id].username;
//   let email = users[id].email;
//   // console.log(req.cookies.username);
//   // res.render('urls_index', templateVars);
//   console.log("id:", id);
//   console.log("username:", username);
//   console.log("email:", email);
// });

app.post('/urls/:id', (req, res) => {
  let shortURL = req.params.id;
  console.log(req.body);
  console.log(req.body.newLongURL);
  let newLongURL = req.body.newLongURL;
  urlDatabase[shortURL] = newLongURL;
  res.redirect('/urls');
});


app.post('/urls/:shortURL/delete', (req, res) => {
  let shortURL = req.params.shortURL;
  delete urlDatabase[shortURL]
  res.redirect('/urls')
});


app.post('/urls', (req, res) => {
  console.log(req.body)
  let urlShort = generateRandomString();
  let urlLong = req.body.longURL;
  urlDatabase[urlShort] = urlLong;
  res.redirect(`/urls/${urlShort}`);
});



function generateRandomString() {
  let randomString = "";
  for (let i = 0; i < 6; i++) {
    let aCode = Math.floor(Math.random() * 32) + 56;
    randomString += String.fromCharCode(aCode);
  }
  return randomString;
}

app.get('/urls/:shortURL', (req, res) => {
  let shortURL = req.params.shortURL
  let user_id = req.cookies.user_id;

  const templateVars = { shortURL, longURL, user: users[user_id] };
  res.render('urls_show', templateVars);
});

app.post('/login', (req, res) => {
  let email = req.body.email;

  for (let value of Object.values(users)) {
    if (value.email === email) {
      res.cookie('user_id', value.id);
    }
  }
  res.redirect('/urls');
});


app.post('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.post("/urls/:shortURL/delete", (req, res) => {
  let shortURL = req.params.shortURL;
  console.log(shortURL);
  delete urlDatabase[shortURL];
  res.redirect(`/urls`);
});

//route to register page
app.get('/register', (req, res) => {
  let user_id = req.cookies.user_id;
  const templateVars = { user: users[user_id] };
  res.render('register');
});

app.post("/register", (req, res) => {
  // const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  let id = generateRandomString();

  users[id] = { id, email, password };
  console.log(users);

  res.cookie('user_id', id);
  res.redirect('/urls');
});