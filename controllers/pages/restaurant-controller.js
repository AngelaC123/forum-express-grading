const { Restaurant, Category, Comment, User } = require('../../models')
const restaurantServices = require('../../services/restaurant-services')

const restaurantController = {
  getRestaurants: (req, res, next) => {
    restaurantServices.getRestaurants(req, (err, data) => err ? next(err) : res.render('restaurants', data))
  },

  getRestaurant: (req, res, next) => {
    return Restaurant.findByPk(req.params.id, {
      include: [
        Category,
        { model: Comment, include: User },
        { model: User, as: 'FavoritedUsers' },
        { model: User, as: 'LikedUsers' }
      ]
    })
      .then(restaurant => {
        if (!restaurant) throw new Error("restaurant didn't exist!")
        return restaurant.increment('view_counts')
      })
      .then(restaurant => {
        const isFavorited = restaurant.FavoritedUsers.some(f => f.id === req.user.id)
        const isLiked = restaurant.LikedUsers.some(l => l.id === req.user.id)
        res.render('restaurant', {
          restaurant: restaurant.toJSON(),
          isFavorited,
          isLiked
        })
      })
      .catch(err => next(err))
  },

  getDashboard: (req, res, next) => {
    return Restaurant.findByPk(req.params.id, {
      raw: true,
      nest: true,
      include: [Category]
    })
      .then(restaurant => {
        if (!restaurant) throw new Error("restaurant didn't exist!")
        return res.render('dashboard', { restaurant })
      })
      .catch(err => next(err))
  },
  getFeeds: (req, res, next) => {
    // get restaurants comments category
    // get commnets user restaurants
    // render page
    return Promise.all([
      Restaurant.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [Category],
        raw: true,
        nest: true
      }),
      Comment.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [Restaurant, User],
        raw: true,
        nest: true
      })
    ])
      .then(([restaurants, comments]) => {
        res.render('feeds', { restaurants, comments })
      })
      .catch(err => next(err))
  },

  getTopRestaurants: (req, res, next) => {
    const LIMIT = 10

    return Restaurant.findAll({
      include: [{ model: User, as: 'FavoritedUsers' }]
    })
      .then(restaurants => {
        // const favoritedRestaurantsId = req.user && req.user.FavoritedRestaurants.map(f => f.id)

        const result = restaurants
          .map(r => ({
            ...r.toJSON(),
            favoritedCount: r.FavoritedUsers.length,
            // isFavorited: favoritedRestaurantsId.includes(r.id)
            isFavorited: req.user && req.user.FavoritedRestaurants.some(fr => r.id === fr.id)
          }))

          .sort((a, b) => b.favoritedCount - a.favoritedCount)

        const topTenRestaurants = result.slice(0, LIMIT)

        return res.render('top-restaurants', { restaurants: topTenRestaurants })
      })

      .catch(err => next(err))
  }

}

module.exports = restaurantController
