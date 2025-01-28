// src/components/CustomWordCloud.js
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

const CustomWordCloud = ({ words, width = 800, height = 400 }) => {
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const layout = cloud()
      .size([width, height])
      .words(words.map((word) => ({ text: word.text, size: word.value })))
      .padding(5)
      .rotate(() => (~~(Math.random() * 6) - 3) * 30)
      .font('Arial')
      .fontSize((d) => d.size)
      .on('end', draw);

    layout.start();

    function draw(words) {
      svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`)
        .selectAll('text')
        .data(words)
        .enter()
        .append('text')
        .style('font-size', (d) => `${d.size}px`)
        .style('font-family', 'Arial')
        .style('fill', '#1976d2')
        .attr('text-anchor', 'middle')
        .attr('transform', (d) => `translate(${d.x}, ${d.y})rotate(${d.rotate})`)
        .text((d) => d.text);
    }
  }, [words, width, height]);

  return <svg ref={svgRef}></svg>;
};

export default CustomWordCloud;