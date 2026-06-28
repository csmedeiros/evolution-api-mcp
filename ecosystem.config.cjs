module.exports = {
  apps: [{
    name: 'evolution-mcp',
    script: '/root/.nvm/versions/node/v20.10.0/bin/node',
    args: 'dist/server.js',
    cwd: '/root/evolution-api-mcp',
    env: {
      MCP_TRANSPORT: 'http',
      MCP_PORT: '3010',
      MCP_API_KEY: '315b9b45f8c9df651b557881ae6983239cc3b270bf7f257188ab41761c47e92e',
      OAUTH_ISSUER_URL: 'https://whatsapp.ovalordaia.com.br',
      OAUTH_TOKEN_SECRET: '55f4534331184c2ae3772404ffd7e8a162d4e11c9eadcfe7905882f0126bcc49',
      EVOLUTION_API_KEY: '528fe79292b03a34dde526cc259d598757123d37352b83be41c1c6d4ae9b0479',
      EVOLUTION_API_URL: 'http://localhost:8080',
      PG_HOST: '127.0.0.1',
      PG_USER: 'ecosystem',
      PG_PASSWORD: 'T9rKWI0Go4raV+ZbyDdAlLztxL6hlUH2',
      PG_DATABASE_PERSONAL: 'personal'
    }
  }]
}
