import './style.css'
import * as d3 from "d3"
import links from './link-profiles/default.json'

// const svg = d3.select("svg");

const width = 1200;
const height = 400;
const margin = { top: 10, left: 30 , right: 0, bottom: 20 };

// find the data max X value
const xmax = links.reduce((max = 0, item) => {
            const dxmax = item.data.reduce((m, d) => d.x > m ? d.x : m, 0);
            return dxmax > max ? dxmax : max
    },  0);

// find the data max Y value
const ymax = links.reduce((max = 0, item) => {
        const dymax = item.data.reduce((m, d) => d.y > m ? d.y : m, 0);
        return dymax > max ? dymax : max
    },  0);



// set scales based on xmax and ymax values and margins
const xScale = d3.scaleLinear()
    .range([margin.left, width - margin.right]) // pixels
    .domain([0, xmax*1.1]).nice() // real world units

const yScale = d3.scaleLinear()
    .range([height - margin.bottom, margin.top])
    .domain([0, ymax]).nice()



// create the svg element
const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)

// Add the x-axis.
svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .classed("axis", true)
    .call(d3.axisBottom(xScale));

// Add the y-axis.
svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .classed("axis", true)
    .call(d3.axisLeft(yScale));


// show mouse coords
svg.append("g").append("text")
    .attr("id", "mouse-xy")
    .attr("x", width-210)           // Horizontal position from left
    .attr("y", 10)          // Vertical position from top
    .text("Mouse x:, y:")    // The text content
    .style("fill", "black")   // Font color
    .style("font-size", "10px");

svg.on("mousemove", function(event) {
    var mouseX = xScale.invert(d3.pointer(event)[0]);
    var mouseY = yScale.invert(d3.pointer(event)[1]);

    mouseX = Math.round(mouseX);
    mouseY = Math.round(mouseY);

    d3.select("#mouse-xy").text(`scaled x:${mouseX} , y:${mouseY} : event x:${event.x} , y:${event.y}`)
})



// line constructor
const line = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y));


// add extended links to links array
links.map(link => {
    links.push({
        linkSet: link.linkSet,
        position: link.position,
        ext: true,
        data: extendLink(link)
    })
})


// create link ids
links.map((link, i) => {
    // link.id = (link.ext ? "ext" : "link")+i
    link.id = i
})

// find intersections
links.map(link => {
    intersectLinks2D(link)
})

// add link lines
// svg.selectAll(".linkLine")
//     .data(links, d => d.id)
//     .join(
//         enter => enter.append("path")
//             .attr("d", l => line(l.data))
//             .attr("id", link => link.id)
//             .classed("linkLine", true)
//             .classed(link => link.linkSet, true)
//             .classed(link => link.position, true)
//             .classed("extendedLink", link => link.ext),
//         update => {console.log(update); update;},
//         exit => exit.remove()
//     )

// create link line groups
const linkLines = svg.selectAll("g.linkLine")
    .data(links)
    .join("g")
    .attr("id", l => l.id)
    // .attr("class", link => `linkLine ${link.linkSet} ${link.position}`, true)

// append link lines
linkLines.append("path")
    .attr("d", l => line(l.data))
    .attr("class", link => `linkLine ${link.linkSet} ${link.position}`, true)
    .classed("extendedLink", link => link.ext)

// add control points
linkLines.filter(link => !link.ext)
    .selectAll(".controlPoint")
    .data(l => l.data)
    .join(
        enter => enter.append("circle")
            .attr("id", (l,i) => i)
            .attr("cx", p => xScale(p.x))
            .attr("cy", p => yScale(p.y))
            .attr("r", 5)
            .classed("controlPoint", true)
            .call(d3.drag()
                .subject(function(event) {
                    return {x: event.x, y: event.y};
                })
                .on("drag", draggy)
                .on("start", event => {
                    console.log("dragging start", event, this)
                    d3.select(event.sourceEvent.target).classed("grabbing", true);
                })
                .on("drag", draggy)
                .on("end", event => {
                    d3.select(event.sourceEvent.target).classed("grabbing", false);
                })
            ),
        update => update,
        exit => exit.remove()
    )


// add the svg to the container
d3.select("#container").append(() => svg.node())
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto");


// 4. Drag event function
function draggy(event) {
    // Update the circle's position
    d3.select(this)
        .attr("cx", event.x)
        .attr("cy", event.y)

    // Update link-profiles coordinates to match current mouse/touch position
    links[this.parentNode.id].data[this.id].x = xScale.invert(event.x);
    links[this.parentNode.id].data[this.id].y = yScale.invert(event.y);

    // links.filter(l => !l.ext).forEach(mainLink =>
    //     console.log(links.filter(l => l.position === mainLink.position && l.linkSet === mainLink.linkSet && l.ext === true))
    // )

    const mainLinks = links.filter(l => !l.ext)

    // re-extend all primary links in same link set
    mainLinks.forEach(mainLink => {
        // find matching extended link line and re-extend it
        links.filter(l => l.ext && l.position === mainLink.position && l.linkSet === mainLink.linkSet)
            .map(extLink => {
                extLink.data = extendLink(mainLink);
            })
    })

    // recalculate intersections in link set
    links.filter(l => l.ext === true)
        .map(link => {
            intersectLinks2D(link);
        })

    // console.log(svg.selectAll(".linkLine"))

    // redraw link lines
    svg.selectAll("path.linkLine")
        .data(links, d => d.id)
        // .attr("d", l => line(l.data))
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
    const ext = 1200;

    // Extrapolate the new controlPoint (x3, y3)
    const x3 = x2 + (dx / len) * ext;
    const y3 = y2 + (dy / len) * ext;

    return [
        {x: x2, y: y2},
        {x: x3, y: y3}
    ];
}

function intersectLinks2D(linkA) {
    const ax1 = linkA.data[0].x;
    const ay1 = linkA.data[0].y;
    const ax2 = linkA.data[1].x;
    const ay2 = linkA.data[1].y;

    // linkB will be the other vertical position extended line
    const linkB = links.find(l => (
        l.linkSet === linkA.linkSet
        && l.position !== linkA.position
        && l.position !== "panhard" && l.ext === true
    ));

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

            // trim the link extensions
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