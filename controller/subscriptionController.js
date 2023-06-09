const { insertSubscriptionToDB, getSubscriptionFromDB } = require("../DB/subscriptionDB");
const { updateCreditToDB, getUserFromDB } = require("../DB/userDB");
const { insertSubscriptionForUserToDB, updateIsActiveToDB, getUserSubFromDB } = require("../DB/userSubDB");
const { insertInvoiceToDB } = require("../DB/invoiceDB");

const timers = new Map();

const { TaskTimer } = require("tasktimer");
const TIME_INTERVAL = 60 * 1000 * 1;
const createSubscription = (req, res) => {
    const name = req.body.name;
    const price = req.body.price;

    insertSubscriptionToDB(name, price).then(data => {
        res.status(200).json({
            message: "Created one subscription",
            data: data
        });
    }).catch(err => {
        res.status(500).json({
            message: "Failed to create subscription"
        });
    })
}


const buySubscription = (req, res) => {
    const user_id = req.body.user_id;
    const subs_name = req.body.subscription_name;
    const end_date = req.body.end_date;
    insertSubscriptionForUserToDB(user_id, subs_name, end_date).then(data => {
        res.status(200).json({
            message: "Bouught subscription.",
            data: data
        })
    }).catch(err => {
        console.log(err);
        res.status(500).json({
            message: "Failed to buy subscription.",
        })
    })
}

const activateSubscription = (req, res) => {
    const user_id = req.body.user_id;
    const subs_name = req.body.subscription_name;
    let start_date = new Date();
    getUserSubFromDB(user_id, subs_name).then(user_sub => {
        
        if (user_sub.is_active) {
            res.status(200).json({
                message: "is active now"
            })

        } else { // start invoice scheduling if subs is not active now
            updateIsActiveToDB(user_id, subs_name, true).then(async (user_sub) => {
                const subscription_end_time = user_sub.end_date;
                const price = (await getSubscriptionFromDB(subs_name)).price;
                
                const timer = new TaskTimer(TIME_INTERVAL);
                
                // schedule job for each TIME_INTERVAL
                timer.add([
                    {
                        tickInterval: 1,
                        callback(task) {
                            const end_date = new Date();
                            getUserFromDB(user_id).then(user => {
                                const credit = user.credit;
                                // if no more time or cash, finish subscription
                                if (credit - price < 0 || end_date > subscription_end_time) {
                                    timer.stop();
                                    updateIsActiveToDB(user_id, subs_name, false);
                                } else {
                                    insertInvoiceToDB(user_id, subs_name, start_date, end_date, price).catch(err => {
                                        console.log("error!: ",err);
                                    }); // insert invoice

                                    start_date = end_date;
                                    updateCreditToDB(user_id, credit - price); // deposit cash
                                }
                            }).catch(err => {
                                console.log("error: ", err);
                                timer.stop();
                                updateIsActiveToDB(user_id, subs_name, false);
                            });

                        }
                    }
                ]);
                
                timer.start();

                timers.set(user_id+subs_name, timer);
                
                res.status(200).json({
                    message: "Activated successfully",
                });

            }).catch(err => {
                console.log(err);
                res.json({
                    message: "Failed to activate subscription"
                });
            });
        }
    })

}


const deactiveSubscription = (req, res) => {
    const user_id = req.body.user_id;
    const subs_name = req.body.subscription_name;
    updateIsActiveToDB(user_id, subs_name, false).then(data => {
        timers.get(user_id+subs_name).stop();
        res.status(200).json({
            message: "Deactivated successfuly"
        });
    }).catch(err => {
        console.log(err);
        res.status(500).json({
            message: "Failed to deactivate"
        });
    });
}


module.exports = { createSubscription, buySubscription, activateSubscription, deactiveSubscription }