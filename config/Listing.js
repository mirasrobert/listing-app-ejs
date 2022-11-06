const mongoose = require('mongoose')

const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

const ListingSchema = mongoose.Schema(
  {
    name: String,
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    imageUrl: String,
    description: String,
    price: String,
    address: String,
    reviews: [reviewSchema],
  },
  {
    timestamps: true,
  }
)

const Listing = mongoose.model('Listing', ListingSchema)

module.exports = Listing
