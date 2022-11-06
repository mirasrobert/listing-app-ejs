const mongoose = require('mongoose')

const DATABASE_NAME = 'listings'

const CONNECTION_STRING = `mongodb://localhost:27017/${DATABASE_NAME}`

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(CONNECTION_STRING, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    })

    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

module.exports = connectDB
