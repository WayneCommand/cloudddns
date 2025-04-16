# DDNS based on Cloudflare Workers

## Features

- DDNS

## Quick Start

### Requirements

- Node.js
- Cloudflare Account

### Installation & Deployment

1. Clone the repository
```bash
git clone [repository-url]
cd cloudddns
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
Create a `.env` file and set the following variables:
```env
CF_TOKEN=your_token_here
API_ACCESS_KEY=your_api_key_here
```

4. Start the service
```bash
npm start
```

Visit `http://localhost:8787` to use the app.

## API Documentation

### Update DDNS Record

```shell
curl --ipv4 -X POST 'https://ddns.waynecommand.com/{identifier}' \
  -H 'Authorization: Bearer {token}'
```

### Query All Records

```shell
curl -X GET 'https://ddns.waynecommand.com/records' \
  -H 'Authorization: Bearer {token}'
```