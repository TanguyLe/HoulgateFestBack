/**
 * Time-related routes
 */

module.exports = (app) => {
    /**
     * Get current time in Europe/Paris timezone
     */
    app.route("/time/paris").get((req, res) => {
        const now = new Date();
        // Create date string in Europe/Paris timezone
        const options = { 
            timeZone: 'Europe/Paris',
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        };
        
        const parisTime = now.toLocaleString('fr-FR', options);
        
        res.status(200).send({
            timezone: 'Europe/Paris',
            time: parisTime,
            timestamp: now.getTime()
        });
    });
}; 