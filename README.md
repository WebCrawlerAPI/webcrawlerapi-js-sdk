# JS client for WebcrawlerAPI scrapers

Official client for [WebcrawlerAPI](https://webcrawlerapi.com/) scrapers.

## Installation
Install WebcrawlerAPI js package:

`npm i webcrawlerapi-js`

## Preparation
1. Register to [dashboard|https://dash.webcrawlerapi.com/].
2. Get an [Access Key](https://dash.webcrawlerapi.com/access).

## Request example

```javascript
const webcrawlerapi = require('webcrawlerapi-js');

async function main() {
    const client = new webcrawlerapi.WebcrawlerClient(
        "YOUR API KEY HERE"
    )
    const response = await client.scrape({
        input: {
            "url": "https://www.funda.nl/detail/koop/heerhugowaard/huis-govert-flinckplantsoen-1/89968455/"
        },
        crawler_id: "webcrawler/funda",
    })
    console.log(response)
}

main().catch(console.error);
```

## Response example
```json
{
  city: 'Heerhugowaard',
  price: 325000,
  images: [ 'https://cloud.funda.nl/valentina_media/191/215/183_2160.jpg' ],
  status: 'inonderhandeling',
  videos: [],
  address: 'Govert Flinckplantsoen 1',
  country: 'Nederland',
  province: 'Noord-Holland',
  plot_area: '183 m²',
  post_code: '1701NH',
  description: 'De woning is met liefde en zorg 53 jaar bewoond door...',
  living_area: 127,
  house_number: 1,
  energie_label: 'd',
  property_type: 'woonhuis',
  publication_date: '2024-05-28T00:00:00',
  number_of_bedrooms: 4,
  coordinates_latitude: 52.67685,
  year_of_construction: 1971,
  coordinates_longitude: 4.8560443,
  house_number_extension: ''
}
```