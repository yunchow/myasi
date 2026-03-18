import math
from PIL import Image, ImageDraw

def create_icon(filename, color_hex, size=144):
    # Base size 24x24, scaled to `size`
    scale = size / 24.0
    
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Parse color
    color = color_hex
    
    # Draw Head (Circle)
    # cx=12, cy=8, r=3.25
    # bbox: (12-3.25, 8-3.25) to (12+3.25, 8+3.25)
    # Scaled
    head_bbox = [
        (12 - 3.25) * scale, (8 - 3.25) * scale,
        (12 + 3.25) * scale, (8 + 3.25) * scale
    ]
    draw.ellipse(head_bbox, fill=color)
    
    # Draw Body (Path approximation)
    # M4.5 19.5
    # c0-3.5 3.5-6 7.5-6
    # s7.5 2.5 7.5 6
    # v0.5
    # c0 .55-.45 1-1 1
    # H5.5
    # c-.55 0-1-.45-1-1
    # v-.5z
    
    # This path describes a rounded shoulder shape.
    # Top curve starts at (4.5, 19.5), goes up to y=13.5 roughly (19.5-6)
    # Center x=12.
    # It's basically an ellipse or rounded rect for the body.
    # Let's approximate with a chord of a circle or a rounded rectangle.
    # The path command `c0-3.5 3.5-6 7.5-6` is a cubic bezier from (4.5, 19.5) to (12, 13.5).
    # And `s7.5 2.5 7.5 6` mirrors it to (19.5, 19.5).
    # So the top edge is a curve from (4.5, 19.5) up to (12, 13.5) and down to (19.5, 19.5).
    # The bottom is flat at y=20 (from v0.5 to y=20, then H5.5, then close).
    
    # We can draw this by drawing a polygon or filling a complex path if PIL supported it well.
    # Since PIL path support is basic, let's draw a high-res polygon to approximate the curve.
    
    points = []
    
    # Helper for cubic bezier
    def cubic_bezier(p0, p1, p2, p3, t):
        return (
            (1-t)**3 * p0[0] + 3*(1-t)**2 * t * p1[0] + 3*(1-t) * t**2 * p2[0] + t**3 * p3[0],
            (1-t)**3 * p0[1] + 3*(1-t)**2 * t * p1[1] + 3*(1-t) * t**2 * p2[1] + t**3 * p3[1]
        )

    # Left side curve: (4.5, 19.5) to (12, 13.5)
    # c0-3.5 3.5-6 7.5-6
    # relative control points: (0, -3.5) and (3.5, -6) -> (4.5, 16.0) and (8.0, 13.5)
    # end point: (4.5+7.5, 19.5-6) = (12, 13.5)
    p0 = (4.5, 19.5)
    p1 = (4.5, 16.0)
    p2 = (8.0, 13.5)
    p3 = (12.0, 13.5)
    
    steps = 20
    for i in range(steps + 1):
        t = i / steps
        x, y = cubic_bezier(p0, p1, p2, p3, t)
        points.append((x * scale, y * scale))
        
    # Right side curve: (12, 13.5) to (19.5, 19.5)
    # s7.5 2.5 7.5 6
    # 's' reflects the previous control point p2 relative to current point p3.
    # reflected p2 = p3 + (p3 - p2) = (12 + (12-8), 13.5 + (13.5-13.5)) = (16.0, 13.5)
    # relative control points from command: (7.5, 2.5) and (7.5, 6) are wrong interpretation of 's'?
    # SVG 's' command: draws cubic bezier from current point to (x,y). 
    # The first control point is reflection of previous. The second control point is (x2, y2).
    # command: s 7.5 2.5 7.5 6 (relative)
    # destination: (12+7.5, 13.5+6) = (19.5, 19.5)
    # control2: (12+7.5, 13.5+2.5) = (19.5, 16.0)
    # control1 (reflected): (16.0, 13.5)
    
    q0 = (12.0, 13.5)
    q1 = (16.0, 13.5)
    q2 = (19.5, 16.0)
    q3 = (19.5, 19.5)
    
    for i in range(1, steps + 1): # skip first point as it's same as last
        t = i / steps
        x, y = cubic_bezier(q0, q1, q2, q3, t)
        points.append((x * scale, y * scale))
        
    # Vertical line down v0.5 -> to (19.5, 20.0)
    # Arc/Curve at bottom right corner: c0 .55 -.45 1 -1 1
    # dest: (19.5-1, 20.0+1) = (18.5, 21.0)
    # c1: (19.5, 20.55)
    # c2: (19.5-0.45, 21.0) = (19.05, 21.0)
    # Actually SVG coordinate system y increases downwards.
    # v0.5 means y becomes 19.5 + 0.5 = 20.
    # c0 .55 -.45 1 -1 1 (relative)
    # from (19.5, 20) to (18.5, 21)
    # cp1 = (19.5, 20.55)
    # cp2 = (19.05, 21)
    
    # Wait, simple approximation:
    # Just draw lines to bottom corners and round them?
    # The path continues: H5.5 (horizontal line to x=5.5)
    # Then c-.55 0 -1 -.45 -1 -1 (relative) -> dest (4.5, 20), cp1(4.95, 21), cp2(4.5, 20.55)
    # Then v-.5 (up to 4.5, 19.5) close.
    
    # Let's just add the bottom points manually or curve them.
    # Bottom right corner curve
    r0 = (19.5, 20.0)
    r1 = (19.5, 20.55)
    r2 = (19.05, 21.0)
    r3 = (18.5, 21.0)
    for i in range(1, steps + 1):
        t = i / steps
        x, y = cubic_bezier(r0, r1, r2, r3, t)
        points.append((x * scale, y * scale))
        
    # Bottom line to x=5.5
    points.append((5.5 * scale, 21.0 * scale))
    
    # Bottom left corner curve
    # c-.55 0 -1 -.45 -1 -1 (from 5.5, 21.0)
    # dest: (4.5, 20.0)
    # cp1: (4.95, 21.0)
    # cp2: (4.5, 20.55)
    s0 = (5.5, 21.0)
    s1 = (4.95, 21.0)
    s2 = (4.5, 20.55)
    s3 = (4.5, 20.0)
    for i in range(1, steps + 1):
        t = i / steps
        x, y = cubic_bezier(s0, s1, s2, s3, t)
        points.append((x * scale, y * scale))
        
    # Close shape (up to start)
    points.append((4.5 * scale, 19.5 * scale))
    
    draw.polygon(points, fill=color)
    
    img.save(filename, 'PNG')
    print(f"Generated {filename}")

if __name__ == "__main__":
    # Blue: #0A84FF (Active)
    create_icon('src/miniprogram/assets/my-active.png', '#0A84FF')
    # Gray: #8E8E93 (Inactive)
    create_icon('src/miniprogram/assets/my.png', '#8E8E93')
