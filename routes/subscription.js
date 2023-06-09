const express = require("express");
const router = express.Router();
const {createSubscription, buySubscription, activateSubscription, deactiveSubscription} = require("../controller/subscriptionController");

router.post('/create', createSubscription);
router.post('/buy', buySubscription);
router.post('/activate', activateSubscription);
router.post('/deactivate', deactiveSubscription);

router.get('/', (req, res) => {
    res.send("endpoints: /create, /buy, /activate, /deactivate");
})
module.exports = router;