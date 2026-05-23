// chart.js - Modern Custom Dynamic SVG Chart Engine

/**
 * Draws a premium, responsive area line chart representing revenue trends
 * @param {HTMLElement} container - Target container element
 * @param {Array<number>} data - Revenue numeric values (e.g. 6 items)
 * @param {Array<string>} labels - Month labels (e.g. 6 items)
 */
window.drawRevenueLineChart = function(container, data, labels) {
  if (!container) return;
  container.innerHTML = "";

  const containerWidth = container.clientWidth || 600;
  const containerHeight = container.clientHeight || 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 60 };

  const chartWidth = containerWidth - padding.left - padding.right;
  const chartHeight = containerHeight - padding.top - padding.bottom;

  const maxVal = Math.max(...data) * 1.15 || 10000;
  const minVal = 0;

  // Calculate coordinates
  const points = data.map((val, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, value: val, label: labels[index] };
  });

  // Bezier Control points for smooth curves
  let pathD = "";
  let fillD = "";

  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    fillD = `M ${points[0].x} ${containerHeight - padding.bottom}`;
    fillD += ` L ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 3;
      const cpY1 = curr.y;
      const cpX2 = curr.x + (2 * (next.x - curr.x)) / 3;
      const cpY2 = next.y;

      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
      fillD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }

    fillD += ` L ${points[points.length - 1].x} ${containerHeight - padding.bottom} Z`;
  }

  // Generate SVG Code
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "svg-chart");
  svg.setAttribute("viewBox", `0 0 ${containerWidth} ${containerHeight}`);

  // Create Gradient Definition
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const linearGrad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  linearGrad.setAttribute("id", "chart-gradient");
  linearGrad.setAttribute("x1", "0");
  linearGrad.setAttribute("y1", "0");
  linearGrad.setAttribute("x2", "0");
  linearGrad.setAttribute("y2", "1");

  const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "var(--accent-indigo)");
  stop1.setAttribute("stop-opacity", "0.4");

  const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "var(--accent-indigo)");
  stop2.setAttribute("stop-opacity", "0.0");

  linearGrad.appendChild(stop1);
  linearGrad.appendChild(stop2);
  defs.appendChild(linearGrad);
  svg.appendChild(defs);

  // Draw Horizontal Axis Gridlines (4 lines)
  const gridLinesCount = 4;
  for (let i = 0; i <= gridLinesCount; i++) {
    const yVal = padding.top + (i / gridLinesCount) * chartHeight;
    const valueRepresented = maxVal - (i / gridLinesCount) * (maxVal - minVal);

    // Line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", padding.left);
    line.setAttribute("y1", yVal);
    line.setAttribute("x2", containerWidth - padding.right);
    line.setAttribute("y2", yVal);
    line.setAttribute("class", "chart-axis-line");
    svg.appendChild(line);

    // Label Text
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", padding.left - 10);
    text.setAttribute("y", yVal + 4);
    text.setAttribute("text-anchor", "end");
    text.setAttribute("class", "chart-axis-text");
    text.textContent = `${window.CURRENCY_SYMBOL || '₹'}${Math.round(valueRepresented).toLocaleString()}`;
    svg.appendChild(text);
  }

  // Draw Gradient Area Fill
  if (fillD) {
    const fillPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    fillPath.setAttribute("d", fillD);
    fillPath.setAttribute("class", "chart-gradient-fill");
    svg.appendChild(fillPath);
  }

  // Draw Curve Path Line
  if (pathD) {
    const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    linePath.setAttribute("d", pathD);
    linePath.setAttribute("class", "chart-line");
    // Animation trigger
    const totalLength = 1000;
    linePath.setAttribute("stroke-dasharray", totalLength);
    linePath.setAttribute("stroke-dashoffset", totalLength);
    svg.appendChild(linePath);
    
    // Smooth drawing trigger
    setTimeout(() => {
      linePath.style.transition = "stroke-dashoffset 1.2s ease-out";
      linePath.style.strokeDashoffset = "0";
    }, 50);
  }

  // Draw Interactive Hover Points
  points.forEach((pt) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", pt.x);
    circle.setAttribute("cy", pt.y);
    circle.setAttribute("class", "chart-point");
    circle.setAttribute("title", `${pt.label}: ${window.CURRENCY_SYMBOL || '₹'}${pt.value.toLocaleString()}`);

    // Simple reactive mouse interaction
    circle.addEventListener("mouseenter", (e) => {
      const tooltip = document.createElement("div");
      tooltip.id = "chart-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.background = "var(--bg-solid-card)";
      tooltip.style.border = "1px solid var(--border-color)";
      tooltip.style.borderRadius = "var(--radius-sm)";
      tooltip.style.padding = "8px 12px";
      tooltip.style.fontSize = "12px";
      tooltip.style.color = "var(--text-primary)";
      tooltip.style.fontWeight = "600";
      tooltip.style.boxShadow = "var(--shadow-premium)";
      tooltip.style.left = `${pt.x - 40}px`;
      tooltip.style.top = `${pt.y - 45}px`;
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "10";
      tooltip.innerHTML = `<span style="color:var(--text-tertiary)">${pt.label}</span><br>${window.CURRENCY_SYMBOL || '₹'}${pt.value.toLocaleString()}`;
      
      container.appendChild(tooltip);
    });

    circle.addEventListener("mouseleave", () => {
      const tooltip = container.querySelector("#chart-tooltip");
      if (tooltip) tooltip.remove();
    });

    svg.appendChild(circle);

    // Label Text for X-axis
    const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelText.setAttribute("x", pt.x);
    labelText.setAttribute("y", containerHeight - padding.bottom + 20);
    labelText.setAttribute("text-anchor", "middle");
    labelText.setAttribute("class", "chart-axis-text");
    labelText.textContent = pt.label;
    svg.appendChild(labelText);
  });

  container.appendChild(svg);
}

/**
 * Draws a clean circular SVG donut chart representing Deal Stage metrics
 * @param {HTMLElement} container - Target container element
 * @param {Array<{label: string, count: number, color: string}>} slices - Array of slice data
 */
window.drawDealDonutChart = function(container, slices) {
  if (!container) return;
  container.innerHTML = "";

  const containerWidth = container.clientWidth || 300;
  const containerHeight = container.clientHeight || 200;
  const size = Math.min(containerWidth, containerHeight);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.35;
  const circumference = 2 * Math.PI * radius;

  const total = slices.reduce((acc, s) => acc + s.count, 0);

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "center";
  wrapper.style.width = "100%";
  wrapper.style.height = "100%";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  // Base background ring
  const bgRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  bgRing.setAttribute("cx", cx);
  bgRing.setAttribute("cy", cy);
  bgRing.setAttribute("r", radius);
  bgRing.setAttribute("class", "donut-circle-bg");
  svg.appendChild(bgRing);

  // Render values
  let currentAngleOffset = -90; // Start at top 12 o'clock

  const slicesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

  slices.forEach((slice) => {
    if (slice.count === 0 || total === 0) return;

    const percentage = slice.count / total;
    const strokeLength = circumference * percentage;
    const strokeOffset = circumference - strokeLength;
    const rotationAngle = currentAngleOffset;

    const valRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    valRing.setAttribute("cx", cx);
    valRing.setAttribute("cy", cy);
    valRing.setAttribute("r", radius);
    valRing.setAttribute("class", "donut-circle-value");
    valRing.style.stroke = slice.color;
    valRing.style.strokeDasharray = `${strokeLength} ${circumference}`;
    valRing.style.strokeDashoffset = strokeLength; // set initially fully offsets for transition
    valRing.style.transformOrigin = `${cx}px ${cy}px`;
    valRing.style.transform = `rotate(${rotationAngle}deg)`;

    // Interactive tooltip overlay triggers
    valRing.addEventListener("mouseenter", (e) => {
      valRing.style.strokeWidth = "28px";
      
      const tooltip = document.createElement("div");
      tooltip.id = "donut-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.background = "var(--bg-solid-card)";
      tooltip.style.border = "1px solid var(--border-color)";
      tooltip.style.borderRadius = "var(--radius-sm)";
      tooltip.style.padding = "6px 10px";
      tooltip.style.fontSize = "12px";
      tooltip.style.color = "var(--text-primary)";
      tooltip.style.fontWeight = "600";
      tooltip.style.boxShadow = "var(--shadow-premium)";
      tooltip.style.left = `${cx - 45}px`;
      tooltip.style.top = `${cy - 20}px`;
      tooltip.style.pointerEvents = "none";
      tooltip.style.textAlign = "center";
      tooltip.style.zIndex = "10";
      tooltip.innerHTML = `<span style="font-size:10px;text-transform:uppercase;color:var(--text-tertiary)">${slice.label}</span><br>${slice.count} Deals (${Math.round(percentage * 100)}%)`;
      wrapper.appendChild(tooltip);
    });

    valRing.addEventListener("mouseleave", () => {
      valRing.style.strokeWidth = "24px";
      const tooltip = wrapper.querySelector("#donut-tooltip");
      if (tooltip) tooltip.remove();
    });

    slicesGroup.appendChild(valRing);

    // Animate segments
    setTimeout(() => {
      valRing.style.transition = "stroke-dashoffset 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      valRing.style.strokeDashoffset = "0";
    }, 50);

    currentAngleOffset += percentage * 360;
  });

  svg.appendChild(slicesGroup);

  // Middle center text details
  const totalCountText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  totalCountText.setAttribute("x", cx);
  totalCountText.setAttribute("y", cy + 4);
  totalCountText.setAttribute("text-anchor", "middle");
  totalCountText.setAttribute("fill", "var(--text-primary)");
  totalCountText.setAttribute("font-family", "var(--font-title)");
  totalCountText.setAttribute("font-size", "22px");
  totalCountText.setAttribute("font-weight", "800");
  totalCountText.textContent = total;
  svg.appendChild(totalCountText);

  const totalLabelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  totalLabelText.setAttribute("x", cx);
  totalLabelText.setAttribute("y", cy + 20);
  totalLabelText.setAttribute("text-anchor", "middle");
  totalLabelText.setAttribute("fill", "var(--text-tertiary)");
  totalLabelText.setAttribute("font-size", "10px");
  totalLabelText.setAttribute("font-weight", "600");
  totalLabelText.setAttribute("letter-spacing", "0.5px");
  totalLabelText.textContent = "TOTAL DEALS";
  svg.appendChild(totalLabelText);

  wrapper.appendChild(svg);

  // Generate beautiful accompanying legend list beside
  const legend = document.createElement("div");
  legend.className = "donut-legend";

  slices.forEach(slice => {
    const item = document.createElement("div");
    item.className = "legend-item";
    
    const colorBlock = document.createElement("div");
    colorBlock.className = "legend-color";
    colorBlock.style.background = slice.color;
    
    const textLabel = document.createElement("span");
    textLabel.innerHTML = `<strong style="color:var(--text-primary)">${slice.count}</strong> ${slice.label}`;

    item.appendChild(colorBlock);
    item.appendChild(textLabel);
    legend.appendChild(item);
  });

  wrapper.appendChild(legend);
  container.appendChild(wrapper);
}
