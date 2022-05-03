const express = require('express')
const router = express.Router()

const upload = require('../../../middleware/multer')

const adminController = require('../../../controllers/apis/admin-controller')

router.post('/restaurants', upload.single('image'), adminController.postRestaurant)
router.delete('/restaurants/:id', adminController.deleteRestaurant)
router.get('/restaurants', adminController.getRestaurants)

module.exports = router
