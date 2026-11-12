import math

def calculate_max_push(weight_lbs, cof):
    """Calculates max pushing force in lbs."""
    return weight_lbs * cof

def calculate_motor_force(stall_torque_ozin, num_motors, wheel_diam_in):
    """Calculates total motor stall force in oz."""
    if wheel_diam_in <= 0:
        return 0
    wheel_radius = wheel_diam_in / 2
    return (stall_torque_ozin * num_motors) / wheel_radius

def calculate_tip_speed(diam_in, rpm):
    """Calculates tip speed in mph."""
    if diam_in <= 0:
        return 0
    # (pi * d * RPM * 60) / 63360
    return (math.pi * diam_in * rpm * 60) / 63360

def calculate_ke(weight_lbs, speed_mph):
    """Calculates Kinetic Energy in Joules."""
    mass_kg = weight_lbs * 0.453592
    velocity_ms = speed_mph * 0.44704
    return 0.5 * mass_kg * (velocity_ms ** 2)

def check_connector_safety(bot_class, connector_type, burst_amps, connector_rating):
    """
    Checks connector safety.
    Returns a list of issue dicts: {"type": "error"|"warning", "msg": "..."}
    """
    issues = []
    
    # Rule: Burst Amps > Rating
    if burst_amps > connector_rating:
        issues.append({
            "type": "error", 
            "msg": f"CRITICAL FAIL: Burst Amps ({burst_amps:.1f}A) > Connector Rating ({connector_rating}A). Risk of fire/melting."
        })
        
    # Rule: 15lb class + JST/XT30
    if "15lb" in bot_class and connector_type in ["JST (RCY)", "XT30"]:
        issues.append({
            "type": "error",
            "msg": f"FAIL: {connector_type} is unsafe for 15lb bots. Use XT60 or larger."
        })
        
    # Rule: >60A on XT60
    if burst_amps > 60 and connector_type == "XT60":
        issues.append({
            "type": "warning",
            "msg": "WARN: Current > 60A on XT60 is borderline. Consider XT90."
        })
        
    return issues

def check_weapon_safety(tip_speed_mph, weapon_weight_lbs, total_weight_lbs):
    """
    Checks weapon safety.
    Returns list of issue dicts.
    """
    issues = []
    
    # Rule: Tip Speed > 250mph
    if tip_speed_mph > 250:
        issues.append({
            "type": "error",
            "msg": f"ILLEGAL: Tip Speed ({tip_speed_mph:.1f} mph) exceeds 250 mph limit!"
        })
        
    # Rule: Gyro Forces (>25% weight)
    if total_weight_lbs > 0 and (weapon_weight_lbs / total_weight_lbs) > 0.25:
        issues.append({
            "type": "warning",
            "msg": "WARNING: High Gyro Forces. Bot may be unstable when turning."
        })
        
    return issues

def check_traction_safety(motor_force_oz, max_push_lbs):
    """
    Checks traction match.
    Returns list of issue dicts.
    """
    issues = []
    max_push_oz = max_push_lbs * 16
    
    if motor_force_oz > (2 * max_push_oz):
        issues.append({
            "type": "warning",
            "msg": "⚠️ Optimized: You have more power than grip. Consider higher gear ratio for reliability."
        })
        
    return issues

def calculate_speed(kv, voltage, wheel_diam_in, gear_ratio):
    """
    Calculates Theoretical and Combat speeds in mph.
    Returns (theoretical_mph, combat_mph)
    """
    if gear_ratio <= 0 or wheel_diam_in <= 0:
        return 0.0, 0.0
    
    motor_rpm = kv * voltage
    wheel_rpm = motor_rpm / gear_ratio
    # mph = (wheel_rpm * pi * diam * 60) / 63360
    theoretical_mph = (wheel_rpm * math.pi * wheel_diam_in * 60) / 63360
    combat_mph = theoretical_mph * 0.85
    return theoretical_mph, combat_mph

def check_esc_compatibility(battery_s, esc_max_s):
    """Checks if Battery Voltage exceeds ESC rating."""
    if battery_s > esc_max_s:
        return {
            "type": "error", 
            "msg": f"CRITICAL FAIL: Battery ({battery_s}S) exceeds ESC limit ({esc_max_s}S). Explosion Risk!"
        }
    return None

def check_battery_sufficiency(capacity_mah, c_rating, burst_amps):
    """Checks if battery can handle burst current."""
    # Max Amps = (mAh / 1000) * C
    max_battery_amps = (capacity_mah / 1000) * c_rating
    if max_battery_amps < burst_amps:
        return {
            "type": "warning", 
            "msg": f"Voltage Sag Risk: Battery Max ({max_battery_amps:.1f}A) < Motor Burst ({burst_amps:.1f}A). Potential brownouts."
        }
    return None

def recommend_wire_gauge(burst_amps):
    """Recommends wire gauge based on burst amps."""
    if burst_amps > 60: return "12 AWG or larger"
    if burst_amps > 40: return "14 AWG"
    if burst_amps > 20: return "16 AWG"
    return "20 AWG or larger"

# Material Densities (lbs/in^3)
MATERIAL_DENSITIES = {
    "Aluminum 6061": 0.098,
    "Steel (Mild)": 0.283,
    "Titanium (Grade 5)": 0.160,
    "Polycarbonate (Lexan)": 0.043,
    "PLA Plastic (3D Print)": 0.045,
    "Carbon Fiber": 0.057
}

def calculate_plate_weight(material_name, thickness_in, area_sq_in):
    """Calculates weight of a plate in lbs."""
    density = MATERIAL_DENSITIES.get(material_name, 0)
    return density * thickness_in * area_sq_in

def generate_wiring_diagram(batt_name, conn_name, esc_name, motor_name, num_motors, burst_amps, conn_rating, esc_rating):
    """
    Generates a DOT string for Graphviz.
    """
    import graphviz
    
    dot = graphviz.Digraph()
    dot.attr(rankdir='LR')
    
    # Nodes
    dot.node('B', f'Battery\n{batt_name}', shape='box', style='filled', fillcolor='lightblue')
    dot.node('C', f'Connector\n{conn_name}\n(Rated: {conn_rating}A)', shape='diamond', style='filled', fillcolor='lightgrey')
    
    # Edges & Safety Colors
    # Battery -> Connector
    line_color = 'red' if burst_amps > conn_rating else 'green'
    dot.edge('B', 'C', label=f'{burst_amps:.1f}A', color=line_color, penwidth='2.0')
    
    # Logic for ESCs
    # Assuming 1 ESC per motor for simplicity in visualization if not specified, 
    # but user asked for "Dual Motor / Single ESC" logic.
    # We will visualize based on standard combat setups.
    # If num_motors is even, we can assume pairs.
    
    # For visualization, let's show one "ESC Block" driving the motors to keep it clean,
    # or split if we want to be detailed.
    # Let's implement the requested logic: "Draw one ESC connected to two motors" vs "Two separate chains"
    # Since we don't have a specific input for this yet, we'll default to a clean tree.
    
    # ESC Node
    esc_color = 'red' if burst_amps > (esc_rating * num_motors) else 'lightgreen' # Rough check
    dot.node('E', f'ESC(s)\n{esc_name}\n(Rated: {esc_rating}A)', shape='box', style='filled', fillcolor=esc_color)
    
    # Connector -> ESC
    dot.edge('C', 'E', color=line_color, penwidth='2.0')
    
    # ESC -> Motors
    for i in range(num_motors):
        m_id = f'M{i}'
        dot.node(m_id, f'Motor {i+1}\n{motor_name}', shape='ellipse')
        dot.edge('E', m_id)
        
    return dot



