
class Helpers {
    static parseJson(jsonStr) {
        try {
            if (jsonStr) {
                jsonStr = jsonStr.trim();
                if(jsonStr.length > 0) {
                    return JSON.parse(jsonStr);
                }
            }
        } catch (err) {
            console.log('error parsing json:', err);
        }

        return {};
    }
}

module.exports = Helpers;