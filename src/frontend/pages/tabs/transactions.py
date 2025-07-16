from dash import html
from utils.theme import COLORS, CARD_STYLE

def create_transactions_tab():
    """Create the transactions tab content"""
    
    content_style = {
        'backgroundColor': COLORS['background_primary'],
        'padding': '24px',
        'margin': '0',
        'minHeight': '100%',
        'width': '100%'
    }
    
    return html.Div([
        html.H1("Transactions", style={
            'color': COLORS['text_primary'],
        }),
        # Add your transactions content here
    ], style=content_style)
