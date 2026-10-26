let mongoose = require("mongoose"),
    Shotgun = mongoose.model("Shotguns"),
    User = mongoose.model("Users"),
    ShotgunsHistory = require("../shotgunHistoryModel");

// Moves the shotguns to the history of `edition`, then frees every room and user for the next
// edition. Each step can be run again: a shotgun already in the history for this edition is
// overwritten, not duplicated, so a failed historisation can just be retried.
// Pre-shotguns are bookings that were never completed: they are dropped, not historized.
exports.historizeShotguns = async (edition) => {
    const shotguns = await Shotgun.find({ status: "shotgunned" });

    if (shotguns.length)
        await ShotgunsHistory.bulkWrite(
            shotguns.map((shotgun) => ({
                updateOne: {
                    filter: { edition: edition._id, user: shotgun.user },
                    update: {
                        $set: {
                            status: shotgun.status,
                            room: shotgun.room,
                            roommates: shotgun.roommates,
                        },
                    },
                    upsert: true,
                },
            }))
        );

    const deleted = await Shotgun.deleteMany({
        $or: [
            { _id: { $in: shotguns.map((shotgun) => shotgun._id) } },
            { status: "preShotgunned" },
        ],
    });
    const reset = await User.updateMany(
        { $or: [{ hasShotgun: true }, { hasPreShotgun: true }, { room: { $ne: null } }] },
        { $set: { hasShotgun: false, hasPreShotgun: false, room: null } }
    );

    return {
        historized: shotguns.length,
        droppedPreShotguns: deleted.deletedCount - shotguns.length,
        usersReset: reset.modifiedCount,
    };
};

exports.getHistoryCounts = () =>
    ShotgunsHistory.aggregate([{ $group: { _id: "$edition", count: { $sum: 1 } } }]);
