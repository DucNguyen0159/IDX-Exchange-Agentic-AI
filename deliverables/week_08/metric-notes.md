# Week 5 market metric notes

These notes describe how the internship market-stats skill uses california_sold.

## List-to-close ratio

List-to-close ratio (also written listToClosePct) is the average of ClosePrice / ListPrice for recent Residential sold comps in a city, shown as a percent.

Formula used in Week 5:

AVG(ClosePrice / ListPrice) * 100

Example from the Week 5 Irvine check: list-to-close was 98%. That means the typical close price was about 98% of the list price.

This is the same idea as a sale-to-list ratio. In this project the skill name for the figure is list-to-close.

## Related Week 5 figures

- Days on market (DOM): average DaysOnMarket for recent Residential sold comps
- Median close price: middle ClosePrice among those sold comps
- Price per sq ft: average ClosePrice / LivingArea
- Months of supply: active listings / (sold count in last 12 months / 12)

## california_sold role

california_sold is the sold-comps table. Week 5 market answers come from california_sold, with active inventory counts from rets_property.
