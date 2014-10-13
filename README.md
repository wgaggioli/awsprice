AWS Price Analysis
====

A simple SPA to analyze AWS On Demand and Spot prices for linux instances
across the available regions. Uses the AWS API endpoints for pricing
information:

  - Spot: [http://spot-price.s3.amazonaws.com/spot.js](http://a0.awsstatic.com/pricing/1/ec2/linux-od.min.js)
  - On Demand: [http://a0.awsstatic.com/pricing/1/ec2/linux-od.min.js](http://a0.awsstatic.com/pricing/1/ec2/linux-od.min.js)

Install
---

    npm install

Run
---

    node server.js

Then just point your html5 compliant web browser to `http://127.0.0.1:8080`

Todo
---

- Add tests! (did not have a chance, as I don't have my node stack nailed down and ran out of time. Shame!)
- Change aggregated spot/demand plots to % avg deviation instead of comparing aggregate price (current method heavily favors the more expensive instances)
