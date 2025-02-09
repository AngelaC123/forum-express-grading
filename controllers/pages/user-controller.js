const { User, Comment, Restaurant, Favorite, Like, Followship } = require('../../models')

const userServices = require('../../services/user-services')

const { imgurFileHandler } = require('../../helpers/file-helpers')
const { getUser } = require('../../helpers/auth-helpers')

const userController = {
  signUpPage: (req, res) => {
    res.render('signup')
  },

  signUp: (req, res, next) => {
    userServices.signUp(req, (err, data) => {
      if (err) return next(err)
      req.flash('success_messages', 'Your account has registered!')
      res.redirect('/signin')
    })
  },

  signInPage: (req, res) => {
    res.render('signin')
  },
  signIn: (req, res) => {
    req.flash('success_messages', 'login sucessfully!')
    res.redirect('/restaurants')
  },
  logout: (req, res) => {
    req.flash('success_messages', 'logout successcully!')
    req.logout()
    res.redirect('/signin')
  },

  getUser: (req, res, next) => {
    const user = req.user
    const onCheckedUserId = Number(req.params.id)
    return User.findByPk(onCheckedUserId, {
      include: [
        { model: Comment, include: Restaurant },
        { model: User, as: 'Followings' },
        { model: User, as: 'Followers' },
        { model: Restaurant, as: 'FavoritedRestaurants' }
      ]
    })

      .then(onCheckedUser => {
        if (!onCheckedUser) throw new Error("User didn't exist!")

        onCheckedUser = onCheckedUser.toJSON()
        const commentedRestaurantId = []
        const onCheckedUserCommentedRestaurants = []

        // eslint-disable-next-line array-callback-return
        onCheckedUser.Comments.map(data => {
          if (!commentedRestaurantId.includes(data.restaurantId)) {
            commentedRestaurantId.push(data.restaurantId)
            onCheckedUserCommentedRestaurants.push(data)
          }
        })
        res.render('users/profile', { user, onCheckedUser, onCheckedUserCommentedRestaurants })
      })
      .catch(err => next(err))
  },

  editUser: (req, res, next) => {
    const id = Number(req.params.id)
    const userId = getUser(req).id

    if (userId !== id) {
      req.flash('error_messages', '您沒有權限瀏覽該頁面！')
      return res.redirect('/restaurants')
    }
    return User.findByPk(id, { raw: true })
      .then(user => {
        if (!user) throw new Error("User didn't exist!")
        return res.render('users/edit', { user })
      })
      .catch(err => next(err))
  },

  putUser: (req, res, next) => {
    const id = req.params.id
    const { file } = req

    const { name } = req.body
    if (!name) throw new Error('User name is required!')

    return Promise.all([
      User.findByPk(id),
      imgurFileHandler(file)
    ])
      .then(([user, filePath]) => {
        if (!user) throw new Error("User didn't exist!")
        return user.update({
          name,
          image: filePath || user.image
        })
      })
      .then(() => {
        req.flash('success_messages', '使用者資料編輯成功')
        return res.redirect(`/users/${id}`)
      })
      .catch(err => next(err))
  },

  addFavorite: (req, res, next) => {
    const { restaurantId } = req.params

    return Promise.all([
      Restaurant.findByPk(restaurantId),
      Favorite.findOne({
        where: {
          restaurantId,
          userId: req.user.id
        }
      })
    ])
      .then(([restaurant, favorite]) => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        if (favorite) throw new Error('You have favorited this restaurant already!')

        return Favorite.create({
          restaurantId,
          userId: req.user.id
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },

  removeFavorite: (req, res, next) => {
    return Favorite.findOne({
      where: {
        userId: req.user.id,
        restaurantId: req.params.restaurantId
      }
    })
      .then(favorite => {
        if (!favorite) throw new Error("You haven't favorited this restaurant!")
        return favorite.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },

  addLike: (req, res, next) => {
    const { restaurantId } = req.params

    return Promise.all([
      Restaurant.findByPk(restaurantId),
      Like.findOne({
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
    ])
      .then(([restaurant, like]) => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        if (like) throw new Error('You have liked this restaurant already!')

        return Like.create({
          restaurantId,
          userId: req.user.id
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeLike: (req, res, next) => {
    const { restaurantId } = req.params

    return Like.findOne({
      where: {
        userId: req.user.id,
        restaurantId
      }
    })
      .then(like => {
        if (!like) throw new Error("You haven't liked this restaurant")
        return like.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },

  getTopUsers: (req, res, next) => {
    return User.findAll({
      include: [{ model: User, as: 'Followers' }]
    })
      .then(users => {
        const result = users
          .map(user => ({
            ...user.toJSON(),
            followerCount: user.Followers.length,
            isFollowed: req.user.Followings.some(f => f.id === user.id)
          }))
          .sort((a, b) => b.followerCount - a.followerCount)
        res.render('top-users', { users: result })
      })
      .catch(err => next(err))
  },

  addFollowing: (req, res, next) => {
    const { userId } = req.params
    return Promise.all([
      User.findByPk(userId),
      Followship.findOne({
        where: {
          followingId: userId,
          followerId: req.user.id
        }
      })

    ])

      .then(([user, followship]) => {
        if (!user) throw new Error("User didn't exist!")
        if (followship) throw new Error('You have already followed the user')

        return Followship.create({
          followingId: userId,
          followerId: req.user.id
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },

  removeFollowing: (req, res, next) => {
    return Followship.findOne({
      where: {
        followingId: req.params.userId,
        followerId: req.user.id
      }
    })
      .then(followship => {
        if (!followship) throw new Error("You haven't followed this user!")

        return followship.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  }

}

module.exports = userController
