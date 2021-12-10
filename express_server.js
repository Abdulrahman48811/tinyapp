const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const cookieParser = require('cookie-parser');
app.set("view engine", "ejs");

// const urlDatabase = {
//   "b2xVn2": "http://www.lighthouselabs.ca",
//   "9sm5xK": "http://www.google.com"
// };

const urlDatabase = {
  b6UTxQ: {
    longURL: 'https://www.tsn.ca',
    userID: 'huhu89'
  },
  i3BoGr: {
    longURL: 'https://www.google.ca',
    userID: 'huhu89'
  }
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
  if (urlDatabase[req.params.shortURL]) {
    res.redirect(urlDatabase[req.params.shortURL].longURL);
  } else {
    res.send('Invalid short URL');
  }
});

app.get('/urls/new', (req, res) => {
  let user_id = req.cookies.user_id;
  if (user_id) {
    const templateVars = { user: users[user_id] };
    res.render('urls_new', templateVars);
  } else {
    res.redirect('/login');
  }
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

app.post('/urls/:shortURL', (req, res) => {
  let shortURL = req.params.shortURL;
  let newLongURL = req.body.newLongURL;
  if (newLongURL) {
    urlDatabase[shortURL].longURL = newLongURL;
    res.redirect('/urls');
  } else {
    res.send('No URL entered');
  }
});


app.post('/urls/:shortURL/delete', (req, res) => {
  let shortURL = req.params.shortURL;
  delete urlDatabase[shortURL]
  res.redirect('/urls')
});


app.post('/urls', (req, res) => {
  let shortURL = generateRandomString();
  let longURL = req.body.longURL;
  let userID = req.cookies.user_id;
  urlDatabase[shortURL] = { longURL, userID };
  res.redirect(`/urls/${shortURL}`);
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
  let shortURL = req.params.shortURL;
  let user_id = req.cookies.user_id;
  let longURL = req.params.longURL;
  const templateVars = { shortURL, longURL, user: users[user_id] };
  res.render('urls_show', templateVars);
});

app.post('/login', (req, res) => {
  let email = req.body.email;

  for (let value of Object.values(users)) {
    console.log(value.email);
    console.log(email);
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
  res.render('register', templateVars);
});

app.post("/register", (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password) {
    return res.status(400).send("Email or Password CANNOT be blank");
  }
  function findUserByEmail(email) {
    for (const userId in users) {
      const user = users[userId];
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }
  if (findUserByEmail(email)) {
    return res.status(400).send("That email has been used to register");
  } else {
    users[id] =
    {
      id,
      email,
      password
    };
    res.cookie("id", id);
    res.redirect("/urls");
  }
  console.log(users);
});

app.get('/login', (req, res) => {
  let user_id = req.cookies.user_id;
  const templateVars = { user: users[user_id] };
  res.render('login', templateVars);
});

app.post('/login', (req, res) => {
  let { email, password } = req.body;

  let user = searchUser(email);

  if (!email || !password) {
    res.statusCode = 400;
    res.send('400 - missing email or password');
  } else if (searchUser(email)) {
    res.statusCode = 400;
    res.send('400 - email already exists');
  } else {
    let id = generateRandomString();

    users[id] = { id, email, password };
    console.log(users);

    res.cookie('user_id', id);
    res.redirect('/urls');
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}

function searchUser(email) {
  for (let user of Object.values(users)) {
    if (user.email === email) return user;
  }
}