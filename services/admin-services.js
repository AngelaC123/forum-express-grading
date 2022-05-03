const { Restaurant, Category } = require('../models')

const adminController = {
  getRestaurants: (req, cb) => {
    Restaurant.findAll({
      raw: true,
      nest: true,
      include: [Category]
    })
      .then(restaurants => cb(null, { restaurants }))
      .catch(err => cb(err))
  },

  deleteRestaurant: (req, cb) => {
    return Restaurant.findByPk(req.params.id)
      .then(restaurant => {
        if (!restaurant) throw new Error("Restaruant didn't exist")
        return restaurant.destroy()
      })
      .then(deletedRestaurant => cb(null, { deletedRestaurant }))
      .catch(err => cb(err))
  }

}

module.exports = adminController
