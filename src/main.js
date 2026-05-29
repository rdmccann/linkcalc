import './style.css'
import * as d3 from "d3"
import links from './link-profiles/default.json'

// const svg = d3.select("svg");

const width = 600;
const height = 400;
const margin = { top: 0, right: 0, bottom: 0, left: 0 };

const x = d3.scaleLinear()
    .range([margin.left, width - margin.right])
    .domain([0, 600]);

const y = d3.scaleLinear()
    .range([height - margin.bottom, margin.top])
    .domain([0, 400]);

const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)

// Add the x-axis.
// svg.append("g")
//     .attr("transform", `translate(0,${height - margin.bottom})`)
//     // .style("stroke", "#000")
//     .classed("axis", true)
//     .call(d3.axisBottom(x));

// Add the y-axis.
// svg.append("g")
//     .attr("transform", `translate(${margin.left},0)`)
//     .classed("axis", true)
//     .call(d3.axisLeft(y));

// line constructor
const line = d3.line()
    .x(d => d.x)
    .y(d => d.y);

// extend links
links.map(link => {
    links.push({
        linkSet: link.linkSet,
        position: link.position,
        ext: true,
        data: extendLink(link)
    })
})

links.map((link, i) => {
    // link.id = (link.ext ? "ext" : "link")+i
    link.id = i
})

// find intersections
links.map(link => {
    intersectLinks2D(link)
})

links.forEach((link, i) => {
    svg.append("path")
        // .datum(link.data)
        .data([link.data])
        .attr("d", line)
        .attr("id", link.id)
        .classed("linkLine", true)
        .classed(link.linkSet, true)
        .classed(link.position, true)
        .classed("extendedLink", link.ext)

    if(!link.ext) {
        svg.append("circle")
            .attr("cx", link.data[1].x)
            .attr("cy", link.data[1].y)
            .attr("r", 5)
            .attr("id", i)
            .classed("endPoint", true)
            .classed(link.linkSet, true)
            .classed(link.position, true)
        .style("cursor", "pointer")
        .call(d3.drag().on("drag", draggy)
            .on("start", event => {
                d3.select(event.sourceEvent.target).classed("grabbing", true);
            })
            .on("drag", draggy)
            .on("end", event => {
                d3.select(event.sourceEvent.target).classed("grabbing", false);
            })
        )
    }
})

// add the svg to the container
d3.select("#container").append(() => svg.node());

// 4. Drag event function
function draggy(event) {
    // Update the circle's position
    d3.select(this)
        .attr("cx", event.x)
        .attr("cy", event.y);

    // Update link-profiles coordinates to match current mouse/touch position
    const id = Number(this.id.replace("endPoint", ""));
    links[id].data[1].x = event.x;
    links[id].data[1].y = event.y;

    // re-extend all primary links in same link set
    links.filter(l => !l.ext).forEach(mainLink => {
        // console.log("main link", mainLink, extendLink(link))
        links
            .filter(extLink => extLink.position === mainLink.position && extLink.linkSet === mainLink.linkSet && extLink.ext === true)
            .map(extLink => {
                // console.log("pre", "link", mainLink, "extended link", extLink);
                extLink.data = extendLink(mainLink);
                // console.log("post", "link", mainLink, "extended link", extLink);
            })
    })

    // recalculate intersections in link set
    links.filter(l => l.ext === true)
        .map(link => {
            intersectLinks2D(link);
        })

    // redraw link lines
    svg.selectAll(".linkLine")
        .data(links)
        .attr("d", l => line(l.data))
}

function extendLink(inLink) {
    const x1 = inLink.data[0].x;
    const y1 = inLink.data[0].y;
    const x2 = inLink.data[1].x;
    const y2 = inLink.data[1].y;

    // Calculate current length (len) and directional vector
    const dx = x2 - x1;
    const dy = y2 - y1;

    const len = Math.sqrt(dx**2 + dy**2);

    // Define how much longer you want the line to be
    const ext = 500;

    // Extrapolate the new endpoint (x3, y3)
    const x3 = x2 + (dx / len) * ext;
    const y3 = y2 + (dy / len) * ext;

    const outDatum = [
        {x: x2, y: y2},
        {x: x3, y: y3}
    ]

    console.log("extended Link", inLink, outDatum);

    return outDatum;
}

function intersectLinks2D(linkA) {
    const ax1 = linkA.data[0].x;
    const ay1 = linkA.data[0].y;
    const ax2 = linkA.data[1].x;
    const ay2 = linkA.data[1].y;

    // linkB will be the other vertical position extended line
    const linkB = links.find(l => (l.linkSet === linkA.linkSet && l.position !== linkA.position && l.position !== "panhard" && l.ext === true));

    const bx1 = linkB.data[0].x;
    const by1 = linkB.data[0].y;
    const bx2 = linkB.data[1].x;
    const by2 = linkB.data[1].y;

    // console.log("intersect", "linkA", linkA, "linkB", linkB);

    // denominator, checks for parallel if zero
    const d = ((by2 - by1)  * (ax2 - ax1)) - ((bx2 - bx1) * (ay2 - ay1));
    if(d !== 0) {
        const t = ((bx1 - ax1) * (by2 - by1) - (by1 - ay1) * (bx2 - bx1)) / d;
        const s = ((bx1 - ax1) * (ay2 - ay1) - (by1 - ay1) * (ax2 - ax1)) / d;

        if (t >= 0 && t <= 1 && s >= 0 && s <= 1) {
            const intersectionX = Number(ax1 + (ax2 - ax1) * t);
            const intersectionY = Number(ay1 + (ay2 - ay1) * t);

            // set the link extensions =
            links.filter(l => (l.linkSet === linkA.linkSet && l.ext === true))
                .map((l) => {
                    l.data[1].x = intersectionX;
                    l.data[1].y = intersectionY;
                })

            // console.log(d3.selectAll("point", "intersection"))
        }
    }

        return null;
    // })
}