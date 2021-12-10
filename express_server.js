const express = require("express");
// const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const { getUserByEmail } = require('./helpers.js');
const methodOverride = require('method-override');
const PORT = 8080;
const app = express();
app.set("view engine", "ejs");

// const urlDatabase = {
//   "b2xVn2": "http://www.lighthouselabs.ca",
//   "9sm5xK": "http://www.google.com"
// };

const users = {
  "abdul": {
    user_id: "abdul",
    email: "abdulrahman48811@gmail.com",
    // hashedPassword: /* 'asdf' */ `purple'
  }
};

const urlDatabase = {
  b6UTxQ: {
      longURL: "https://www.tsn.ca",
      userID: "aJ48lW"
  },
  i3BoGr: {
      longURL: "https://www.google.ca",
      userID: "aJ48lW"
  }
};

// const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cookieSession({
    name: 'session',
    keys: [ 'superUltraSpecialSecretKey' ],
    user_id: undefined,
    maxAge: 60 * 60 * 1000 
  })
);
app.use(methodOverride('_method'));

app.get("/", (req, res) => {
  let user_id = req.session.user_id;
  if (user_id && users[user_id]) {
    res.redirect('/urls');
  } else {
    res.redirect('/login');
  }
});

app.get('/database', (req, res) => {
  res.json({ users, urlDatabase });
});

app.get('/u/:shortURL', (req, res) => {
  let shortURL = req.params.shortURL;
  // let user_id = req.cookies.user_id;
  let user_id = req.session.user_id;
  let urlData = urlDatabase[shortURL];

  let { invalidAccess, accessDenialHandler } = accessCheck(urlData, user_id);

  if (invalidAccess) {
    accessDenialHandler(res, urlData, user_id);
  } else {
    res.redirect(urlDatabase[shortURL].longURL);
  }
});


app.get('/urls', (req, res) => {
  // let user_id = req.cookies.user_id;
  let user_id = req.session.user_id;
  console.log(user_id);
  let filteredUrlDatabase = Object.fromEntries(
    Object.entries(urlDatabase).filter(([ key, value ]) => value.user_id === user_id)
  );
  const templateVars = { urls: filteredUrlDatabase, user: users[user_id] };
  res.render('urls_index', templateVars);
});


app.post('/urls', (req, res) => {
  // let user_id = req.cookies.user_id;

  let user_id = req.session.user_id;
  let user = users[user_id];
  if (user) {
    let shortURL = generateRandomString();
    let longURL = req.body.longURL;
    let date = new Date();
    let timesShortURLVisited = 0;
    let uniqueVisits = 0;

    urlDatabase[shortURL] = { longURL, user_id };
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.send('Request Denied. Please log in');
  }
});

app.get('/urls/new', (req, res) => {
  // let user_id = req.cookies.user_id;
  let user_id = req.session.user_id;
  if (user_id) {
    const templateVars = { user: users[user_id] };
    res.render('urls_new', templateVars);
  } else {
    res.redirect('/login');
  }
});

app.get('/urls/:shortURL', (req, res) => {
  let urlData = urlDatabase[req.params.shortURL];
  // let user_id = req.cookies.user_id;
  let user_id = req.session.user_id;

  let { invalidAccess, accessDenialHandler } = accessCheck(urlData, user_id);

  if (invalidAccess) {
    accessDenialHandler(res, urlData, user_id);
  } else {
    //* happy path
    const templateVars = {
      shortURL: req.params.shortURL,
      longURL: urlData.longURL,
      user: users[user_id]
    };
    res.render('urls_show', templateVars);
  }
});

app.put('/urls/:shortURL', (req, res) => {
  let newLongURL = req.body.newLongURL;

  let urlData = urlDatabase[req.params.shortURL];
  // let user_id = req.cookies.user_id;
  let user_id = req.session.user_id;

  let { invalidAccess, accessDenialHandler } = accessCheck(urlData, user_id);

  if (invalidAccess) {
    accessDenialHandler(res, urlData, user_id);
  } else if (!newLongURL) {
    res.send('No URL entered');
  } else {
    urlDatabase[req.params.shortURL].longURL = newLongURL;
    res.redirect('/urls');
  }
});

app.delete('/urls/:shortURL', (req, res) => {
  let urlData = urlDatabase[req.params.shortURL];
  // let user_id = req.cookies.user_id;
  let user_id = req.sessionOptions.user_id;

  let { invalidAccess, accessDenialHandler } = accessCheck(urlData, user_id);

  if (invalidAccess) {
    accessDenialHandler(res, urlData, user_id);
  } else {
    delete urlDatabase[req.params.shortURL];
    res.redirect('/urls');
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get('/login', (req, res) => {
  // let user_id = req.cookies.user_id;
  let user_id = req.session.user_id;
  const templateVars = { user: users[user_id] };
  res.render('login', templateVars);
});

app.post('/login', (req, res) => {
  let { email, password } = req.body;

  let user = getUserByEmail(email, users);

  if (!email || !password) {
    res.statusCode = 400;
    res.send('400 - missing email or password');
  } else {
    if (user) {
      if (bcrypt.compareSync(password, user.hashedPassword)) {
        // res.cookie('user_id', user.user_id);
        req.session.user_id = user.user_id;
        res.redirect('/urls');
      } else {
        res.statusCode = 400;
        res.send('password does not match');
      }
    } else {
      res.statusCode = 400;
      res.send('user does not exist');
    }
  }
});

app.post('/logout', (req, res) => {
  // res.clearCookie('user_id');
  req.session.user_id = '';
  res.redirect('/urls');
});

app.get('/register', (req, res) => {
  let user_id = req.cookies.user_id;
  const templateVars = { user: users[user_id] };
  res.render('register', templateVars);
});

app.post('/register', (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let hashedPassword = bcrypt.hashSync(password, 10);
  console.log(email, password);
  if (!email || !password) {
    res.statusCode = 400;
    res.send('400 - missing email or password');
  } else if (getUserByEmail(email, users)) {
    res.statusCode = 400;
    res.send('400 - email already exists');
  } else {
    let user_id = generateRandomString();

    users[user_id] = { user_id, email, hashedPassword };
    console.log(users);
    res.redirect(307, '/login');
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});


function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}

// function getUserByEmail(email) {
//   let usersArr = Object.values(users);

//   for (let user of usersArr) {
//     if (user.email === email) return user;
//   }
//   return undefined;
// }

function accessCheck(urlData, user_id) {
  let invalidAccess = false;
  const accessDenialHandler = function(res, urlData, user_id) {
    if (!urlData) {
      res.send('Invalid short URL');
    } else if (!user_id) {
      res.send('Please login to see your URLs');
    } else if (urlData.user_id !== user_id) {
      res.send('Access restricted. Please log onto the correct account to view this URL');
    }
  };
  if (!urlData || !user_id || urlData.user_id !== user_id) {
    invalidAccess = true;
  }
  return { invalidAccess, accessDenialHandler };
}
// app.get('/urls/new', (req, res) => {
//   let id = req.cookies.id;
//   const templateVars = { username: req.cookies.id };
//   res.render('urls_new', templateVars);
// });


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

// app.post('/urls/:shortURL', (req, res) => {
//   let shortURL = req.params.shortURL;
//   let newLongURL = req.body.newLongURL;
//   if (newLongURL) {
//     urlDatabase[shortURL].longURL = newLongURL;
//     res.redirect('/urls');
//   } else {
//     res.send('No URL entered');
//   }
// });







// function generateRandomString() {
//   let randomString = "";
//   for (let i = 0; i < 6; i++) {
//     let aCode = Math.floor(Math.random() * 32) + 56;
//     randomString += String.fromCharCode(aCode);
//   }
//   return randomString;
// }





// app.post('/login', (req, res) => {
//   let email = req.body.email;

//   for (let value of Object.values(users)) {
//     console.log(value.email);
//     console.log(email);
//     if (value.email === email) {
//       res.cookie('user_id', value.id);
//     }
//   }
//   res.redirect('/urls');
// });




// app.get("/hello", (req, res) => {
//   res.send("<html><body>Hello <b>World</b></body></html>\n");
// });

// app.post("/urls/:shortURL/delete", (req, res) => {
//   let shortURL = req.params.shortURL;
//   console.log(shortURL);
//   delete urlDatabase[shortURL];
//   res.redirect(`/urls`);
// });

//route to register page


  //   res.send('400 - missing email or password');
  // } else if (getUserByEmail(email)) {
  //   res.statusCode = 400;
  //   res.send('400 - email already exists');
  // } else {
  //   let user_id = generateRandomString();

  //   users[user_id] = { user_id, email, password };
  //   console.log(users);

  //   res.cookie('user_id', id);
  //   res.redirect('/urls');
  // }
// });/