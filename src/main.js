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

    d3.select("#mouse-xy").text(`x:${mouseX} , y:${mouseY}`)
})



// line constructor
const line = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y));


// add extended links to links data array
links.map(link => {
    links.push({
        linkSet: link.linkSet,
        position: link.position,
        ext: true,
        data: extendLink(link)
    })
})


// add properties on vertex objects for linkSet and position
links.map(link => {
    link.data.map(p => {
        Object.defineProperties(p, {
            linkSet: {
                get: function () {
                    return link.linkSet
                },
                enumerable: false // Hidden from loops/Object.keys()
            },
            position: {
                get: function () {
                    return link.position
                },
                enumerable: false // Hidden from loops/Object.keys()
            }
        })
    })
})


// create link ids
links.map((link, i) => {
    link.id = i
})

// find intersections
links.map(link => {
    intersectLinks2D(link)
})


// append groups for each link line
const linkLines = svg.selectAll("g.linkLine")
    .data(links)
    .join("g")
    .attr("id", l => l.id)
    .attr("linkset", p => p.linkSet)
    .attr("position", p => p.position)

// append link lines
linkLines.append("path")
    .attr("d", l => line(l.data))
    .attr("linkset", p => p.linkSet)
    .attr("position", p => p.position)
    .attr("class", link => `linkLine ${link.linkSet} ${link.position}`, true)
    .classed("extendedLink", link => link.ext)

// add control points to primary linkLines
linkLines.filter(link => !link.ext)
    .selectAll(".controlPoint")
    // select the line point data array to add control points for every vertex (usually just start/end)
    .data(l => l.data)
    .join(
        // add circle control points at each vertex for each mainLink
        enter => enter.append("circle")
            .attr("id", (l,i) => i)
            .attr("cx", p => xScale(p.x))
            .attr("cy", p => yScale(p.y))
            .attr("r", 5)
            .attr("linkset", p => p.linkSet)
            .attr("position", p => p.position)
            .classed("controlPoint", true)

            .call(d3.drag()
                // manually set the subject to mouse position
                .subject(function(event) {
                    return {x: event.x, y: event.y};
                })
                .on("drag", draggy)
                .on("start", event => {
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

    // if this is an intersection point
    if(d3.select(this).classed("intersection")) {
        console.log("intersection point")
        links.filter(link => link.ext && link.linkSet === this.id)
            .map((extLink) => {
                // move the extended linkLines endpoint to the mouse position
                extLink.data[1].x = xScale.invert(event.x);
                extLink.data[1].y = yScale.invert(event.y);

                // find the matching main link and find it's starting point
                links.filter(link => !link.ext && link.position === extLink.position && link.linkSet === extLink.linkSet)
                    .map((mainLink) => {

                        // calculate the link end points (mid-points)
                        const x1 = mainLink.data[0].x;
                        const y1 = mainLink.data[0].y;
                        const x2 = extLink.data[1].x;
                        const y2 = extLink.data[1].y;

                        // Calculate current length (len) and directional vector
                        const dx = x2 - x1;
                        const dy = y2 - y1;

                        const len = Math.sqrt(dx**2 + dy**2);

                        const x3 = x1 + dx * (mainLink.length/len)
                        const y3 = y1 + dy * (mainLink.length/len)

                        // move the main link end point
                        mainLink.data[1].x = x3;
                        mainLink.data[1].y = y3;
                        // move the coincident ext link start point
                        extLink.data[0].x = x3;
                        extLink.data[0].y = y3;

                        // select the corresponding mainLink control point and move it
                        svg.selectAll(`circle[linkSet='${mainLink.linkSet}'][position='${mainLink.position}']`)
                            // .filter((p, i) => i === 1)
                            .attr("cx", p => xScale(p.x))
                            .attr("cy", p => yScale(p.y))
                    })
            })

    } else {

        // Update link-profiles coordinates to match current mouse/touch position
        links[this.parentNode.id].data[this.id].x = xScale.invert(event.x);
        links[this.parentNode.id].data[this.id].y = yScale.invert(event.y);

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
    }

    // console.log(svg.selectAll(".linkLine"))

    // redraw link lines
    svg.selectAll("path.linkLine")
        .data(links, d => d.id)
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

    inLink.length = len;

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

            if (svg.selectAll(`.intersection.${linkA.linkSet}`).size() === 0) {
                // append intersection points
                svg.append("circle")
                    // .data({linkA: linkA, linkB: linkB, cx: intersectionX, cy: intersectionY})
                    .attr("id", linkA.linkSet)
                    .attr("cx", p => xScale(linkA.data[1].x))
                    .attr("cy", p => yScale(linkA.data[1].y))
                    .attr("length", d)
                    .attr("r", 5)
                    .classed(linkA.linkSet, true)
                    .classed("intersection", true)
                    .call(d3.drag()
                        .subject(function (event) {
                            return {x: event.x, y: event.y};
                        })
                        .on("drag", draggy)
                        .on("start", event => {
                            d3.select(event.sourceEvent.target).classed("grabbing", true);
                        })
                        .on("drag", draggy)
                        .on("end", event => {
                            d3.select(event.sourceEvent.target).classed("grabbing", false);
                        })
                    )
            } else {
                // move intersection point
                svg.select(`.intersection.${linkA.linkSet}`)
                    .attr("cx", p => xScale(intersectionX))
                    .attr("cy", p => yScale(intersectionY))
            }
        }
    }

    return null;
}