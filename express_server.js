const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const { getUserByEmail } = require('./helpers.js');
const methodOverride = require('method-override');
const requestIp = require('request-ip');
const PORT = 8080; 
const app = express();
app.set('view engine', 'ejs');

const users = {
  aJ48lW: {
    user_id: 'abdul',
    email: 'abdulrahman48811@gmail.com',
    hashedPassword: `$purple`
  }
};
const urlDatabase = {
  b6UTxQ: {
    longURL: 'https://www.tsn.ca',
    user_id: 'abdul',
    visited: 0,
    visitors: [],
    visitorLog: [],
    created: new Date()
  },
  i3BoGr: {
    longURL: 'https://www.google.ca',
    user_id: 'abdul',
    visited: 0,
    visitors: [],
    visitorLog: [],
    created: new Date()
  }
};

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
app.use(requestIp.mw());



app.get('/', (req, res) => {
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
  let urlData = urlDatabase[shortURL];

  if (urlData) {


    urlData.visited++;

    const ip = req.clientIp;
    if (!urlData.visitors.includes(ip)) {
      urlData.visitors.push(ip);
    }

    urlData.visitorLog.push({ date: new Date(), id: ip });

    res.redirect(urlDatabase[shortURL].longURL);
  } else {
    res.status(400).send('400 - requested link does not exist');
  }
});

app.get('/urls', (req, res) => {
  let user_id = req.session.user_id;

  let filteredUrlDatabase = Object.fromEntries(
    Object.entries(urlDatabase).filter(([ key, value ]) => value.user_id === user_id)
  );
  const templateVars = { urls: filteredUrlDatabase, user: users[user_id] };
  res.render('urls_index', templateVars);
});

app.post('/urls', (req, res) => {
  let user_id = req.session.user_id;
  let user = users[user_id];

  if (user) {
    let shortURL = generateRandomString();
    let longURL = req.body.longURL;

    urlDatabase[shortURL] = {
      longURL,
      user_id,
      visited: 0,
      visitors: [],
      visitorLog: [],
      created: new Date()
    };
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.send('Request Denied. Please log in');
  }
});

app.get('/urls/new', (req, res) => {

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
  let user_id = req.session.user_id;

  let { invalidAccess, accessDenialHandler } = accessCheck(urlData, user_id);

  if (invalidAccess) {
    accessDenialHandler(res, urlData, user_id);
  } else {
    const templateVars = {
      shortURL: req.params.shortURL,
      longURL: urlData.longURL,
      created: urlData.created,
      user: users[user_id],
      visitorLog: urlDatabase[req.params.shortURL].visitorLog
    };
    res.render('urls_show', templateVars);
  }
});

app.put('/urls/:shortURL', (req, res) => {
  let newLongURL = req.body.newLongURL;

  let urlData = urlDatabase[req.params.shortURL];
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
  let user_id = req.session.user_id;

  let { invalidAccess, accessDenialHandler } = accessCheck(urlData, user_id);

  if (invalidAccess) {
    accessDenialHandler(res, urlData, user_id);
  } else {
    delete urlDatabase[req.params.shortURL];
    res.redirect('/urls');
  }
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/login', (req, res) => {
  let user_id = req.session.user_id;
  if (!user_id) {
    const templateVars = { user: users[user_id] };
    res.render('login', templateVars);
  } else {
    res.redirect('/urls');
  }
});

app.post('/login', (req, res) => {
  let { email, password } = req.body;

  let user = getUserByEmail(email, users);

  if (!email || !password) {
    res.status(400).send('400 -Missing Email or Password.');
  } else {
    if (user) {
      if (bcrypt.compareSync(password, user.hashedPassword)) {
        req.session.user_id = user.user_id;
        res.redirect('/urls');
      } else {
        res.status(400).send('400 - password does not match');
      }
    } else {
      res.status(400).send('400 - user does not exist');
    }
  }
});

app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

app.get('/register', (req, res) => {
 
  let user_id = req.session.user_id;
  if (!user_id) {
    const templateVars = { user: users[user_id] };
    res.render('register', templateVars);
  } else {
    res.redirect('/urls');
  }
});

app.post('/register', (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let hashedPassword = bcrypt.hashSync(password, 10);

  
  if (!email || !password) {
    res.status(400).send('400 - missing email or password');
  } else if (getUserByEmail(email, users)) {
 
    res.status(400).send('400 - email already exists');
  } else {
  
    let user_id = generateRandomString();

    users[user_id] = { user_id, email, hashedPassword };


    res.redirect(307, '/login');
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}

function accessCheck(urlData, user_id) {
  let invalidAccess = false;
  const accessDenialHandler = function(res, urlData, user_id) {
    if (!urlData) {
      res.status(400).send('400 - Invalid short URL');
    } else if (!user_id) {
      res.status(400).send('400 - Please login to see your URLs');
    } else if (urlData.user_id !== user_id) {
      res.status(400).send('400 - Access restricted. Please log onto the correct account to view this URL');
    }
  };
  if (!urlData || !user_id || urlData.user_id !== user_id) {
    invalidAccess = true;
  }
  return { invalidAccess, accessDenialHandler };
}