from dash import html

def create_monthly_view_tab():
    """Create the monthly view tab content"""
    
    return html.Div([
        html.H1("Monthly View", className='text-primary'),
        # Add your monthly view content here
    ], className='tab-content')
