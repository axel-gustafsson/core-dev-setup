const request = require('request-promise-native')

const ENGINE_TAGS_URL = 'https://registry.hub.docker.com/v2/repositories/qlikcore/engine/tags/'

module.exports = {
  getLatestEngineVersion: () => {
      return request(ENGINE_TAGS_URL).then(response => {
        return JSON.parse(response).results[0].name
      })
      .catch(err => console.log(err))
  },
};