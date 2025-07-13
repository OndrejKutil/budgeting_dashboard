# =============================================================================
# DASHBOARD PAGE
# =============================================================================
# Main dashboard page that displays user information

import dash
from dash import html, dcc, Input, Output, callback
import dash_bootstrap_components as dbc
from utils.theme import COLORS, DASHBOARD_CONTAINER_STYLE, CARD_STYLE, HEADING_STYLE

def create_dashboard_layout():
    """Create the main dashboard layout with tabbed interface"""
    
    # Custom tab styles using theme colors
    tab_style = {
        'backgroundColor': COLORS['background_secondary'],
        'color': COLORS['text_secondary'],
        'border': f"1px solid {COLORS['card_border']}",
        'borderRadius': '8px 8px 0 0',
        'padding': '12px 24px',
        'fontWeight': 'bold',
        'fontSize': '16px',
        'marginRight': '4px',
        'cursor': 'pointer',
        'transition': 'all 0.3s ease'
    }
    
    tab_selected_style = {
        **tab_style,
        'backgroundColor': COLORS['accent_primary'],
        'color': 'white',
        'borderBottom': f"2px solid {COLORS['accent_primary']}"
    }
    
    tabs_container_style = {
        'backgroundColor': COLORS['background_primary'],
        'borderRadius': '0 0 8px 8px',
        'minHeight': '500px',
        'padding': '24px',
        'border': f"1px solid {COLORS['card_border']}",
        'borderTop': 'none',
        'width': '100%',
        'boxSizing': 'border-box'
    }
    
    return html.Div([
        # Header section
        html.Div([
            html.H1("Budget Dashboard", style={
                **HEADING_STYLE,
                'marginBottom': '32px',
                'fontSize': '36px'
            }),
            html.P("Manage your finances with ease", style={
                'color': COLORS['text_secondary'],
                'textAlign': 'center',
                'fontSize': '18px',
                'marginBottom': '40px'
            })
        ]),
        
        # Main dashboard container - full width
        html.Div([
            # Tabs component
            dcc.Tabs(
                id="dashboard-tabs",
                value="overview",
                children=[
                    dcc.Tab(
                        label="Overview",
                        value="overview",
                        style=tab_style,
                        selected_style=tab_selected_style
                    ),
                    dcc.Tab(
                        label="Transactions",
                        value="transactions",
                        style=tab_style,
                        selected_style=tab_selected_style
                    ),
                    dcc.Tab(
                        label="Analytics",
                        value="analytics",
                        style=tab_style,
                        selected_style=tab_selected_style
                    ),
                ],
                style={
                    'marginBottom': '0px',
                    'width': '100%'
                }
            ),
            
            # Tab content container
            html.Div(
                id="tab-content",
                style=tabs_container_style
            )
        ], style={
            'width': '100%',
            'maxWidth': '100%',
            'padding': '0 24px',
            'boxSizing': 'border-box'
        })
    ], style={
        'backgroundColor': COLORS['background_primary'],
        'minHeight': '100vh',
        'fontFamily': 'Whitney, "Helvetica Neue", Helvetica, Arial, sans-serif',
        'color': COLORS['text_primary'],
        'padding': '24px 0',
        'width': '100%',
        'overflowX': 'hidden'
    })


@callback(
    Output('tab-content', 'children'),
    Input('dashboard-tabs', 'value')
)
def update_tab_content(selected_tab):
    """Update the content based on selected tab"""
    
    # Common card style for content
    content_card_style = {
        **CARD_STYLE,
        'backgroundColor': COLORS['background_secondary'],
        'margin': '0',
        'borderRadius': '8px',
        'minHeight': '400px'
    }
    
    if selected_tab == "overview":
        return html.Div([
            # Welcome card
            html.Div([
                html.H3("Financial Overview", style={
                    'color': COLORS['text_primary'],
                    'marginBottom': '24px',
                    'fontSize': '24px'
                }),
                
                # Stats cards row
                dbc.Row([
                    dbc.Col([
                        html.Div([
                            html.H4("Total Balance", style={
                                'color': COLORS['text_secondary'],
                                'fontSize': '16px',
                                'marginBottom': '8px'
                            }),
                            html.H2("$12,450.00", style={
                                'color': COLORS['accent_success'],
                                'fontSize': '32px',
                                'fontWeight': 'bold',
                                'margin': '0'
                            })
                        ], style={
                            **CARD_STYLE,
                            'backgroundColor': COLORS['background_tertiary'],
                            'textAlign': 'center',
                            'margin': '8px'
                        })
                    ], width=4),
                    
                    dbc.Col([
                        html.Div([
                            html.H4("Monthly Income", style={
                                'color': COLORS['text_secondary'],
                                'fontSize': '16px',
                                'marginBottom': '8px'
                            }),
                            html.H2("+$3,200.00", style={
                                'color': COLORS['accent_success'],
                                'fontSize': '32px',
                                'fontWeight': 'bold',
                                'margin': '0'
                            })
                        ], style={
                            **CARD_STYLE,
                            'backgroundColor': COLORS['background_tertiary'],
                            'textAlign': 'center',
                            'margin': '8px'
                        })
                    ], width=4),
                    
                    dbc.Col([
                        html.Div([
                            html.H4("Monthly Expenses", style={
                                'color': COLORS['text_secondary'],
                                'fontSize': '16px',
                                'marginBottom': '8px'
                            }),
                            html.H2("-$1,890.00", style={
                                'color': COLORS['accent_danger'],
                                'fontSize': '32px',
                                'fontWeight': 'bold',
                                'margin': '0'
                            })
                        ], style={
                            **CARD_STYLE,
                            'backgroundColor': COLORS['background_tertiary'],
                            'textAlign': 'center',
                            'margin': '8px'
                        })
                    ], width=4),
                ], style={'marginTop': '24px'}),
                
                # Recent activity section
                html.Div([
                    html.H4("Recent Activity", style={
                        'color': COLORS['text_primary'],
                        'marginTop': '32px',
                        'marginBottom': '16px'
                    }),
                    html.P("Your latest transactions and account updates will appear here.", style={
                        'color': COLORS['text_secondary'],
                        'fontSize': '16px',
                        'textAlign': 'center',
                        'padding': '40px',
                        'fontStyle': 'italic'
                    })
                ])
            ], style=content_card_style)
        ])
    
    elif selected_tab == "transactions":
        return html.Div([
            html.Div([
                html.H3("Transaction Management", style={
                    'color': COLORS['text_primary'],
                    'marginBottom': '24px',
                    'fontSize': '24px'
                }),
                
                # Add transaction button
                html.Div([
                    html.Button("Add New Transaction", style={
                        'backgroundColor': COLORS['accent_primary'],
                        'color': 'white',
                        'border': 'none',
                        'borderRadius': '8px',
                        'padding': '12px 24px',
                        'fontSize': '16px',
                        'fontWeight': 'bold',
                        'cursor': 'pointer',
                        'marginBottom': '24px'
                    })
                ]),
                
                # Transactions list placeholder
                html.Div([
                    html.P("Transaction history and management tools will be displayed here.", style={
                        'color': COLORS['text_secondary'],
                        'fontSize': '16px',
                        'textAlign': 'center',
                        'padding': '60px',
                        'fontStyle': 'italic'
                    }),
                    html.P("Features coming soon:", style={
                        'color': COLORS['text_primary'],
                        'fontSize': '18px',
                        'fontWeight': 'bold',
                        'textAlign': 'center',
                        'marginBottom': '16px'
                    }),
                    html.Ul([
                        html.Li("Add/Edit/Delete transactions", style={'color': COLORS['text_secondary'], 'marginBottom': '8px'}),
                        html.Li("Filter and search functionality", style={'color': COLORS['text_secondary'], 'marginBottom': '8px'}),
                        html.Li("Category management", style={'color': COLORS['text_secondary'], 'marginBottom': '8px'}),
                        html.Li("Bulk import/export", style={'color': COLORS['text_secondary'], 'marginBottom': '8px'})
                    ], style={'textAlign': 'left', 'maxWidth': '300px', 'margin': '0 auto'})
                ])
            ], style=content_card_style)
        ])
    
    elif selected_tab == "analytics":
        return html.Div([
            html.Div([
                html.H3("Financial Analytics", style={
                    'color': COLORS['text_primary'],
                    'marginBottom': '24px',
                    'fontSize': '24px'
                }),
                
                # Analytics placeholder
                html.Div([
                    html.P("Interactive charts and financial insights will be displayed here.", style={
                        'color': COLORS['text_secondary'],
                        'fontSize': '16px',
                        'textAlign': 'center',
                        'padding': '60px',
                        'fontStyle': 'italic'
                    }),
                    html.P("Analytics features coming soon:", style={
                        'color': COLORS['text_primary'],
                        'fontSize': '18px',
                        'fontWeight': 'bold',
                        'textAlign': 'center',
                        'marginBottom': '16px'
                    }),
                    html.Ul([
                        html.Li("Spending trends over time", style={'color': COLORS['text_secondary'], 'marginBottom': '8px'}),
                        html.Li("Category breakdown charts", style={'color': COLORS['text_secondary'], 'marginBottom': '8px'}),
                        html.Li("Budget vs actual analysis", style={'color': COLORS['text_secondary'], 'marginBottom': '8px'}),
                        html.Li("Financial goal tracking", style={'color': COLORS['text_secondary'], 'marginBottom': '8px'})
                    ], style={'textAlign': 'left', 'maxWidth': '300px', 'margin': '0 auto'})
                ])
            ], style=content_card_style)
        ])
    
    # Default fallback
    return html.Div("Select a tab to view content")