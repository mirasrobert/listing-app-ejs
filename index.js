const express = require('express')
const session = require('express-session')
const app = express()
const path = require('path')
const methodOverride = require('method-override')
const flash = require('connect-flash')

// MODEL
const connectDB = require('./config/db')
const Listing = require('./config/Listing')
const User = require('./config/User')

// COOKIE PARSER
const cookieParser = require('cookie-parser')

connectDB()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Use EJS
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(__dirname + '/public'))

// override with POST having ?_method=DELETE
app.use(methodOverride('_method'))

app.use(cookieParser())
app.use(
  session({
    secret: 'iYxYWXPd3SH8nwcC8bfw00h4jdugphLJo887xHrB',
    cookie: { maxAge: 60000 },
    resave: true,
    saveUninitialized: true,
  })
)
app.use(flash())

// IsAuthenticated Middleware
function IsAuthenticated(req, res, next) {
  const cookies = req.cookies

  if (cookies.isLoggedIn === 'true' && cookies.isLoggedIn != null) {
    console.log('IS LOGGED IN')
    next()
  } else {
    return res.redirect('/login')
  }
}

function IsGuest(req, res, next) {
  const cookies = req.cookies
  if (cookies.isLoggedIn === 'false' && cookies.isLoggedIn != null) {
    console.log('IS GUEST')
    next()
  } else {
    return res.redirect('/')
  }
}

// ROUTES
app.get('/', async (req, res) => {
  const listings = await Listing.find()
    .populate('uploader')
    .sort({ createdAt: 'desc' })
  const cookies = req.cookies

  if (cookies.isLoggedIn == null) {
    res.cookie('isLoggedIn', false)
  }

  const isLoggedIn = cookies.isLoggedIn

  const message = req.flash('message')

  //console.log(listings)
  res.render('index', {
    listings,
    isLoggedIn,
    message,
  })
})

// SHOW LOGIN PAGE @GET
app.get('/login', [IsGuest], (req, res) => {
  const cookies = req.cookies

  const isLoggedIn = cookies.isLoggedIn

  const message = req.flash('message')

  res.render('auth/login', { isLoggedIn, message })
})

app.post('/login', async (req, res) => {
  const { username, password } = req.body

  const user = await User.findOne({ username })

  if (user && (await user.matchPassword(password))) {
    res.cookie('isLoggedIn', true)
    res.cookie('user', user._id)
    res.redirect('/')
  } else {
    // Show Message
    req.flash('message', 'Invalid Username or Password')
    return res.redirect('/login')
  }
})

// SHOW REGISTER PAGE @GET
app.get('/register', [IsGuest], (req, res) => {
  const cookies = req.cookies

  const isLoggedIn = cookies.isLoggedIn
  const message = req.flash('message')

  res.render('auth/register', { isLoggedIn, message })
})

// REGISTER A NEW USER @POST
app.post('/register', async (req, res) => {
  const { username, password } = req.body

  const userExists = await User.findOne({ username })
  if (userExists) {
    req.flash('message', 'Username already taken')
    return res.redirect('/register')
  }

  const user = await User.create({
    username,
    password,
  })

  res.cookie('isLoggedIn', true)
  res.cookie('user', String(user._id))

  return res.redirect('/')
})

app.post('/logout', (req, res) => {
  res.cookie('isLoggedIn', false)
  res.cookie('user', 'None')
  return res.redirect('/')
})

// SHOW CREATE LISTING PAGE @GET
app.get('/listing/new', [IsAuthenticated], (req, res) => {
  const cookies = req.cookies
  const isLoggedIn = cookies.isLoggedIn

  res.render('listing/new', { isLoggedIn })
})

// CREATE LISTING PAGE @POST
app.post('/listing', [IsAuthenticated], async (req, res) => {
  const { name, imageUrl, description, price, address } = req.body

  const cookies = req.cookies
  const user = cookies.user

  const newListing = await Listing.create({
    name,
    uploader: user,
    imageUrl,
    description,
    price,
    address,
  })

  req.flash('message', 'A new listing has been added.')

  res.redirect(`/listing/${newListing._id}`)
})

// SHOW LISTING PAGE @GET
app.get('/listing/:id', async (req, res) => {
  const cookies = req.cookies
  const isLoggedIn = cookies.isLoggedIn
  const user = cookies.user

  const listing = await Listing.findById(req.params.id).populate('uploader')

  const hasReview = await listing.reviews.find(
    (review) => String(review.user) == String(user)
  )

  const isListingOwned =
    listing && String(user) === String(listing.uploader._id)

  const message = req.flash('message')

  res.render('listing/show', {
    id: req.params.id,
    listing,
    isLoggedIn,
    hasReview,
    isListingOwned,
    message,
  })
})

// DELETE A LISTING @DELETE
app.delete('/listing/:id', async (req, res) => {
  await Listing.findOneAndDelete({ _id: req.params.id })

  req.flash('message', 'Your listing has been successfully removed.')

  res.redirect('/')
})

// SHOW EDIT LISTING PAGE @GET
app.get('/listing/:id/edit', [IsAuthenticated], async (req, res) => {
  const cookies = req.cookies
  const isLoggedIn = cookies.isLoggedIn

  const listing = await Listing.findById(req.params.id)

  res.render('listing/edit', { listing, isLoggedIn })
})

// EDIT LISTING PAGE @PUT
app.put('/listing/:id', [IsAuthenticated], async (req, res) => {
  const { name, imageUrl, description, price, address } = req.body

  const user = req.cookies.user

  await Listing.findByIdAndUpdate(req.params.id, {
    name,
    uploader: user,
    imageUrl,
    description,
    price,
    address,
  })

  req.flash('message', 'Your listing has been updated.')

  res.redirect(`/listing/${req.params.id}`)
})

// CREATE REVIEWS @POST
app.post('/reviews/:id', async (req, res) => {
  const { rating, comment } = req.body

  const user = req.cookies.user

  const me = await User.findById(user)

  const listing = await Listing.findById(req.params.id)

  const review = {
    name: me.username,
    rating: Number(rating),
    comment,
    user: user,
  }

  listing.reviews.push(review)
  await listing.save()

  req.flash('message', 'Your review has been subbmited.')

  res.redirect(`/listing/${req.params.id}`)
})

// 404 page
app.get('*', (req, res) => {
  res.render('NOT_FOUND')
})

const PORT = 3000
app.listen(PORT, () => console.log('Server started on PORT ' + PORT))
