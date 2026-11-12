import streamlit as st
import logic
import database
import graphviz

st.set_page_config(page_title="BotCalc Pro", page_icon="🤖", layout="wide")

st.title("🤖 BotCalc Pro: Design Assistant")

BOT_CLASSES = ["1lb (Antweight)", "3lb (Beetleweight)", "12lb (Hobbyweight)", "15lb (Bot)", "30lb (Featherweight)"]

# --- Global Settings ---
with st.sidebar:
    st.header("Bot Configuration")
    bot_class = st.selectbox("Bot Class", BOT_CLASSES, index=1)
    total_weight = st.number_input("Total Bot Weight (lbs)", min_value=0.1, value=3.0, step=0.1)
    st.divider()
    st.write("Developed for Combat Robotics")

# --- Dashboard Layout ---
st.subheader("🛠️ Component Dashboard")
col_p, col_c, col_m = st.columns(3)

with col_p:
    st.markdown("### ⚡ Power")
    batt_names = database.get_part_names("batteries")
    selected_batt_name = st.selectbox("Battery", batt_names)
    batt_data = database.get_part_by_name("batteries", selected_batt_name)
    
    conn_names = database.get_part_names("connectors")
    selected_conn_name = st.selectbox("Main Connector", conn_names)
    conn_data = database.get_part_by_name("connectors", selected_conn_name)

with col_c:
    st.markdown("### 🎛️ Control")
    esc_names = database.get_part_names("escs")
    selected_esc_name = st.selectbox("ESC", esc_names)
    esc_data = database.get_part_by_name("escs", selected_esc_name)

with col_m:
    st.markdown("### 🚗 Motion")
    motor_names = database.get_part_names("motors")
    selected_motor_name = st.selectbox("Motor", motor_names)
    motor_data = database.get_part_by_name("motors", selected_motor_name)
    
    num_motors = st.number_input("Count", 1, 4, 2)
    wheel_diam = st.number_input("Wheel Diam (in)", 0.1, 10.0, 3.0)
    gear_ratio = st.number_input("Gear Ratio", 1.0, 100.0, 10.0)

# --- Data Extraction ---
# Defaults if missing
if not batt_data: batt_data = {}
if not conn_data: conn_data = {}
if not esc_data: esc_data = {}
if not motor_data: motor_data = {}

battery_s = batt_data.get('cells', 0)
batt_mah = batt_data.get('capacity_mah', 0)
batt_c = batt_data.get('c_rating', 0)
conn_rating = conn_data.get('rating', 0)
esc_rating = esc_data.get('current_rating', 0)
esc_max_s = esc_data.get('max_cells', 0)
motor_kv = motor_data.get('kv', 0)
stall_torque = motor_data.get('stall_torque', 0)
stall_current = motor_data.get('stall_current', 0)

# --- Calculations ---
burst_amps = stall_current * num_motors
nominal_voltage = battery_s * 3.7
theo_mph, combat_mph = logic.calculate_speed(motor_kv, nominal_voltage, wheel_diam, gear_ratio)
max_push_lbs = logic.calculate_max_push(total_weight, 0.9) # Default CoF
total_motor_force_oz = logic.calculate_motor_force(stall_torque, num_motors, wheel_diam)

# --- Visual Circuit Diagram ---
st.divider()
st.subheader("🔌 Wiring Diagram & Safety Status")
graph = logic.generate_wiring_diagram(
    selected_batt_name, selected_conn_name, selected_esc_name, 
    selected_motor_name, num_motors, burst_amps, conn_rating, esc_rating
)
st.graphviz_chart(graph)

# --- Gauge Cluster ---
st.divider()
st.subheader("🏎️ Performance Gauges")
g1, g2, g3 = st.columns(3)

with g1:
    st.metric("Combat Speed", f"{combat_mph:.1f} mph")
    # Max speed visual cap 30mph for small bots
    st.progress(min(combat_mph / 30.0, 1.0))
    st.caption(f"Theoretical: {theo_mph:.1f} mph")

with g2:
    st.metric("Burst Current", f"{burst_amps:.1f} A")
    # Max current visual cap based on ESC
    if esc_rating > 0:
        st.progress(min(burst_amps / esc_rating, 1.0))
        st.caption(f"ESC Limit: {esc_rating} A")
    else:
        st.progress(0)

with g3:
    st.metric("Traction Push", f"{max_push_lbs:.1f} lbs")
    # Compare to motor force
    motor_push_lbs = total_motor_force_oz / 16
    if max_push_lbs > 0:
        ratio = min(motor_push_lbs / (max_push_lbs * 2), 1.0)
        st.progress(ratio)
    st.caption(f"Motor Force: {motor_push_lbs:.1f} lbs")

# --- Tabs for Details ---
tab_weapon, tab_budget, tab_manager = st.tabs(["⚔️ Weapon System", "💰 Build & Budget", "🛠️ Part Manager"])

# --- Tab 1: Weapon System (Refactored for Gauges) ---
with tab_weapon:
    st.header("Weapon Kinetic Energy & Safety")
    
    w_col1, w_col2 = st.columns(2)
    
    with w_col1:
        st.subheader("Weapon Selection")
        weapon_names = database.get_part_names("weapons")
        selected_weapon_name = st.selectbox("Select Weapon", weapon_names)
        weapon_data = database.get_part_by_name("weapons", selected_weapon_name)
        
        if weapon_data:
            weapon_weight = weapon_data.get('weight', 0)
            weapon_diam = weapon_data.get('diameter', 0)
        else:
            weapon_weight, weapon_diam = 0, 0
        
    with w_col2:
        target_rpm = st.number_input("Target RPM", min_value=0, value=10000, step=100)
        
    # Calculations
    tip_speed_mph = logic.calculate_tip_speed(weapon_diam, target_rpm)
    ke_joules = logic.calculate_ke(weapon_weight, tip_speed_mph)
    
    # Gauges
    st.write("### Impact Metrics")
    wg1, wg2 = st.columns(2)
    with wg1:
        st.metric("Tip Speed", f"{tip_speed_mph:.1f} mph")
        # Red zone > 250
        st.progress(min(tip_speed_mph / 300.0, 1.0))
        if tip_speed_mph > 250:
            st.error("ILLEGAL: > 250 mph")
    with wg2:
        st.metric("Kinetic Energy", f"{ke_joules:.1f} J")
        st.info("Joules = Damage Potential")


# --- Tab 4: Build & Budget ---
with tab_budget:
    st.header("💰 Build & Budget Manager")
    
    col_b1, col_b2 = st.columns(2)
    
    with col_b1:
        st.subheader("🧰 Component Loadout")
        st.caption("Quantities for parts selected in other tabs.")
        
        qty_motors = st.number_input(f"Qty: {selected_motor_name}", min_value=0, value=num_motors, step=1)
        qty_esc = st.number_input(f"Qty: {selected_esc_name}", min_value=0, value=2, step=1)
        qty_batt = st.number_input(f"Qty: {selected_batt_name}", min_value=0, value=1, step=1)
        qty_weapon = st.number_input(f"Qty: {selected_weapon_name}", min_value=0, value=1, step=1)
        qty_conn = st.number_input(f"Qty: {selected_conn_name}", min_value=0, value=1, step=1)
        
        # Calculate Component Totals
        # Helper to safe get price/weight
        def get_specs(data):
            return data.get("weight", 0), data.get("price", 0)

        m_w, m_p = get_specs(motor_data)
        e_w, e_p = get_specs(esc_data)
        b_w, b_p = get_specs(batt_data)
        w_w, w_p = get_specs(weapon_data)
        c_w, c_p = 0.01, conn_data.get("price", 0) # Connector weight negligible/estimated

        total_comp_weight = (qty_motors * m_w) + (qty_esc * e_w) + (qty_batt * b_w) + (qty_weapon * w_w) + (qty_conn * c_w)
        total_comp_cost = (qty_motors * m_p) + (qty_esc * e_p) + (qty_batt * b_p) + (qty_weapon * w_p) + (qty_conn * c_p)
        
        st.write("---")
        st.write(f"**Components Weight:** {total_comp_weight:.3f} lbs")
        st.write(f"**Components Cost:** ${total_comp_cost:.2f}")

    with col_b2:
        st.subheader("🏗️ Frame Material Estimator")
        mat_name = st.selectbox("Material", list(logic.MATERIAL_DENSITIES.keys()))
        mat_thick = st.number_input("Plate Thickness (in)", min_value=0.0, value=0.125, step=0.001)
        mat_area = st.number_input("Total Surface Area (sq in)", min_value=0.0, value=50.0, step=1.0)
        
        frame_weight = logic.calculate_plate_weight(mat_name, mat_thick, mat_area)
        st.metric("Estimated Frame Weight", f"{frame_weight:.3f} lbs")
        
    st.divider()
    
    # --- Weight Budget Analysis ---
    st.subheader("⚖️ Weight Budget")
    
    # Parse Class Limit from string "3lb (Beetleweight)" -> 3.0
    try:
        class_limit = float(bot_class.split("lb")[0])
    except:
        class_limit = 3.0 # Fallback
        
    total_bot_weight_est = total_comp_weight + frame_weight
    remaining_weight = class_limit - total_bot_weight_est
    
    c1, c2, c3 = st.columns(3)
    c1.metric("Class Limit", f"{class_limit} lbs")
    c2.metric("Total Estimated Weight", f"{total_bot_weight_est:.3f} lbs")
    c3.metric("Remaining Weight", f"{remaining_weight:.3f} lbs", delta_color="normal" if remaining_weight >= 0 else "inverse")
    
    # Progress Bar
    # Clamp value between 0 and 1.0
    progress = min(max(total_bot_weight_est / class_limit, 0.0), 1.0)
    if remaining_weight < 0:
        st.progress(progress, text="⚠️ OVERWEIGHT")
        st.error(f"❌ You are {abs(remaining_weight):.3f} lbs OVER the limit!")
    else:
        st.progress(progress, text="✅ Under Weight")
        
    st.divider()
    st.subheader(f"💵 Total Estimated Project Cost: **${total_comp_cost:.2f}**")
    st.caption("*Cost includes selected components only. Does not include frame materials, shipping, or spares.*")


# --- Tab 5: Part Manager ---
with tab_manager:
    st.header("🛠️ Part Manager")
    
    category = st.selectbox("Category", ["motors", "batteries", "escs", "weapons", "connectors"])
    
    with st.form("add_part_form"):
        st.subheader(f"Add New {category[:-1].capitalize()}")
        name = st.text_input("Part Name")
        
        part_data = {"name": name}
        
        if category == "motors":
            part_data["kv"] = st.number_input("Kv (RPM/V)", min_value=0)
            part_data["stall_torque"] = st.number_input("Stall Torque (oz-in)", min_value=0.0)
            part_data["stall_current"] = st.number_input("Stall Current (A)", min_value=0.0)
            part_data["weight"] = st.number_input("Weight (lbs)", min_value=0.0)
            part_data["price"] = st.number_input("Price ($)", min_value=0.0)
            
        elif category == "batteries":
            part_data["cells"] = st.number_input("Cell Count (S)", min_value=1, step=1)
            part_data["capacity_mah"] = st.number_input("Capacity (mAh)", min_value=0)
            part_data["c_rating"] = st.number_input("C-Rating", min_value=0)
            part_data["weight"] = st.number_input("Weight (lbs)", min_value=0.0)
            part_data["price"] = st.number_input("Price ($)", min_value=0.0)
            
        elif category == "escs":
            part_data["max_cells"] = st.number_input("Max Cells (S)", min_value=1, step=1)
            part_data["current_rating"] = st.number_input("Current Rating (A)", min_value=0.0)
            part_data["weight"] = st.number_input("Weight (lbs)", min_value=0.0)
            part_data["price"] = st.number_input("Price ($)", min_value=0.0)
            
        elif category == "weapons":
            part_data["weight"] = st.number_input("Weight (lbs)", min_value=0.0)
            part_data["diameter"] = st.number_input("Diameter (in)", min_value=0.0)
            part_data["price"] = st.number_input("Price ($)", min_value=0.0)
            
        elif category == "connectors":
            part_data["rating"] = st.number_input("Amp Rating (A)", min_value=0.0)
            part_data["price"] = st.number_input("Price ($)", min_value=0.0)
            
        submitted = st.form_submit_button("Save Component")
        if submitted:
            if name:
                database.add_part(category, part_data)
                st.success(f"Saved {name} to {category}!")
                st.rerun()
            else:
                st.error("Part name is required.")

