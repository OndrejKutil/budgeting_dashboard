# =============================================================================
# DASHBOARD PAGE
# =============================================================================
# Main dashboard page that displays user information

from dash import html, Input, Output, callback, ALL, State, callback_context

from utils.tabs import Tab
from components.navigation import create_navigation_bar
from pages.tabs.overview import create_overview_tab
from pages.tabs.monthly_view import create_monthly_view_tab
from pages.tabs.yearly_view import create_yearly_view_tab
from pages.tabs.transactions import create_transactions_tab
from pages.tabs.accounts import create_accounts_tab
from pages.tabs.profile import create_profile_tab
import json
import dash
from helper.requests.transactions_request import (
    get_accounts,
    get_categories,
    create_transaction,
)

import datetime

def create_dashboard_layout():
    """Create the main dashboard layout with navigation bar interface"""
    
    # Content container style - full width and height, no borders

    
    return html.Div([
        # Navigation bar
        create_navigation_bar(),

        # Content area
        html.Div(
            id="nav-content",
            className='dashboard-content'
        )
        
    ], className='app-container')


@callback(
    Output('nav-content', 'children'),
    Output('navigation-store', 'data'),
    Input({'type': 'nav-button', 'index': ALL}, 'n_clicks'),
    Input('navigation-store', 'data'),
    State('navigation-store', 'data'),
    prevent_initial_call=False
)
def update_navigation_content(n_clicks_list, nav_data_input, nav_data_state):
    """Update the content and navigation state based on clicked navigation button"""
    
    # Find which button was clicked
    ctx = callback_context
    if not ctx.triggered:
        # Initial load, return default content
        return get_tab_content('overview'), {'active_tab': 'overview'}
    
    trigger_id = ctx.triggered[0]['prop_id']
    
    # Check if a navigation button was clicked
    if 'nav-button' in trigger_id:
        button_id = ctx.triggered[0]['prop_id'].split('.')[0]
        button_index = json.loads(button_id)['index']  # Extract the tab index
        
        # Update navigation state
        new_nav_data = {'active_tab': button_index}
        return get_tab_content(button_index), new_nav_data
    
    # Otherwise, just update content based on current navigation state
    active_tab = nav_data_input.get('active_tab', 'overview') if nav_data_input else 'overview'
    return get_tab_content(active_tab), nav_data_input or {'active_tab': 'overview'}


def get_tab_content(selected_tab):
    """Get the content for the selected tab"""
    
    if selected_tab == Tab.OVERVIEW.name.lower():
        return create_overview_tab()
    
    elif selected_tab == Tab.MONTHLY_VIEW.name.lower():
        return create_monthly_view_tab()

    elif selected_tab == Tab.YEARLY_VIEW.name.lower():
        return create_yearly_view_tab()

    elif selected_tab == Tab.ACCOUNTS.name.lower():
        return create_accounts_tab()

    elif selected_tab == Tab.TRANSACTIONS.name.lower():
        return create_transactions_tab()
    
    elif selected_tab == Tab.PROFILE.name.lower():
        return create_profile_tab()
        
    # Default fallback
    return html.Div("Select a tab to view content")



@callback(
    Output("add-transaction-modal", "is_open"),
    Output("transaction-account-dropdown", "options"),
    Output("transaction-category-dropdown", "options"),
    Input("open-add-transaction-button", "n_clicks"),
    Input("close-add-transaction-modal", "n_clicks"),
    State("add-transaction-modal", "is_open"),
    State("token-store", "data"),
    prevent_initial_call=True,
)
def toggle_add_transaction_modal(open_click, close_click, is_open, token_data):
    ctx = callback_context
    if ctx.triggered_id == "open-add-transaction-button" and token_data:
        accounts = get_accounts(token_data.get("access_token", ""))
        categories = get_categories(token_data.get("access_token", ""))
        acc_options = [
            {"label": a.get("name"), "value": a.get("id")}
            for a in accounts.get("data", [])
        ]
        cat_options = [
            {"label": c.get("name"), "value": c.get("id")}
            for c in categories.get("data", [])
        ]
        return True, acc_options, cat_options

    if ctx.triggered_id == "close-add-transaction-modal":
        return False, dash.no_update, dash.no_update


    return is_open, dash.no_update, dash.no_update


@callback(
    Output("add-transaction-modal", "is_open", allow_duplicate=True),
    Input("submit-transaction-button", "n_clicks"),
    State("transaction-account-dropdown", "value"),
    State("transaction-category-dropdown", "value"),
    State("transaction-amount-input", "value"),
    State("transaction-date-input", "date"),
    State("transaction-notes-input", "value"),
    State("transaction-transfer-checkbox", "value"),
    State("token-store", "data"),
    prevent_initial_call=True,
)
def submit_transaction(_, account_id, category_id, amount, date, notes, is_transfer, token_data):
    if not token_data:
        return "Not authenticated", True, dash.no_update

    payload = {
        "account_id": account_id,
        "category_id": category_id,
        "amount": amount,
        "date": date,
        "notes": notes,
        "is_transfer": bool(is_transfer),
        "created_at": datetime.datetime.now().isoformat(),
    }
    create_transaction(token_data.get("access_token", ""), payload)
    return False
