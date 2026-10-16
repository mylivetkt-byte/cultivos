import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, PanelLeftClose, PanelLeftOpen, Search, Activity, LogOut } from 'lucide-react';
import { STATIC_NAVIGATION } from '../config/navigation.jsx';
import '../styles/Sidebar.css';
import '../styles/Sidebar.css';
import { useAuth } from '../context/AuthContext';

function Sidebar({ modules, loading, selectedTable, onSelectTable, onNavigateHome, open, onToggle }) {
  const { logout, user, granular } = useAuth();
  const [search, setSearch] = useState('');
  const [expandedModules, setExpandedModules] = useState({});
  const [expandedSubModules, setExpandedSubModules] = useState({});
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Check user permissions
  const hasAccess = (item) => {
    if (user?.rol === 'Super_Admin' || user?.rol === 'Administrador_Empresa') return true;
    
    // For Submenus (Groups/Folders)
    if (item.items && item.items.length > 0) {
      return item.items.some(child => hasAccess(child));
    }

    // For specific items, check the granular permissions using their ID (which is saved as 'ruta' in the DB)
    if (item.id) {
      return granular?.some(p => p.ruta === item.id && (p.acceder === 1 || p.acceder === true));
    }
    
    // If it's a dynamic table without a static ID, default to checking if it's explicitly allowed (for now allow it)
    return true; 
  };

  // Build the complete navigation tree by merging static config with dynamic tables from backend
  const navigationTree = useMemo(() => {
    // Shallow copy the root and groups to avoid mutating the original config array directly
    // but keep the original React elements intact.
    const tree = STATIC_NAVIGATION.map(group => ({
      ...group,
      items: group.items ? group.items.map(subItem => ({
        ...subItem,
        items: subItem.items ? [...subItem.items] : undefined
      })) : []
    }));
    
    // Manual mapping for some icons if needed for dynamic tables
    const getDynamicIcon = (tableName) => {
      // Default dynamic icon
      return '📄'; 
    };

    const capitalizeWords = (str) => {
      return str.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    };

    // Process each static group and inject dynamic tables if applicable
    tree.forEach(group => {
      // Direct injection for main groups (e.g., Viveros)
      if (group.isDynamicTarget && modules && modules[group.id]) {
        modules[group.id].tables?.forEach(t => {
          if (!group.items.find(i => i.id === t.TABLE_NAME)) {
            group.items.push({ 
              id: t.TABLE_NAME, 
              name: capitalizeWords(t.TABLE_NAME) 
            });
          }
        });
      }

      // Injection for submenus
      group.items.forEach(subItem => {
        if (subItem.isSubmenu && subItem.isDynamicTarget && subItem.dynamicKey && modules && modules[subItem.dynamicKey]) {
          modules[subItem.dynamicKey].tables?.forEach(t => {
            if (!subItem.items.find(i => i.id === t.TABLE_NAME)) {
              subItem.items.push({
                id: t.TABLE_NAME,
                name: capitalizeWords(t.TABLE_NAME)
              });
            }
          });
        }
      });
    });
    return tree;
  }, [modules]);

  // Auto-expand modules based on active path or active dynamic table
  useEffect(() => {
    const currentPath = window.location.pathname;
    navigationTree.forEach(group => {
      let expandGroup = false;
      
      group.items.forEach(item => {
        // Direct item match
        if ((item.path && currentPath === item.path) || (selectedTable && item.id === selectedTable)) {
          expandGroup = true;
        }
        
        // Submenu match
        if (item.isSubmenu && item.items) {
          const hasActiveChild = item.items.some(sub => 
            (sub.path && currentPath === sub.path) || (selectedTable && sub.id === selectedTable)
          );
          
          if (hasActiveChild) {
            expandGroup = true;
            setExpandedSubModules(prev => ({ ...prev, [item.id]: true }));
            setActiveSubmenu(item.id);
          }
        }
      });
      
      if (expandGroup) {
        setExpandedModules(prev => ({ ...prev, [group.id]: true }));
      }
    });
  }, [window.location.pathname, navigationTree, selectedTable]);

  const toggleModule = (id) => {
    if (isCollapsed) setIsCollapsed(false); // Auto expand if collapsed
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubModule = (id) => {
    setExpandedSubModules(prev => ({ ...prev, [id]: !prev[id] }));
    setActiveSubmenu(id);
  };

  const navigate = useNavigate();

  const handleTableClick = (e, tableId, isPlaceholder, name) => {
    e.preventDefault();
    setActiveSubmenu(null);
    if (isPlaceholder) {
      alert('Módulo en construcción: ' + name);
      return;
    }
    if (tableId) {
      navigate('/');
      onSelectTable(tableId);
    }
  };

  if (loading) {
    return (
      <aside className={`sidebar-container ${open ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo-agropaccioli-cropped.png" alt="Logo" style={{ height: '36px', objectFit: 'contain' }} />
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>AGROPACCIOLI</span>
          </div>
        </div>
        <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center' }}>
          Cargando módulos...
        </div>
      </aside>
    );
  }

  // Filter based on search and permissions
  const q = search.trim().toLowerCase();
  
  const renderItem = (item) => {
    if (!hasAccess(item)) return null;

    // If searching, check if it matches
    const matchesSearch = q === '' || item.name.toLowerCase().includes(q);
    
    if (item.isSubmenu) {
      const allowedItems = item.items.filter(sub => hasAccess(sub));
      if (allowedItems.length === 0) return null;

      const subItemsMatch = allowedItems.some(sub => sub.name.toLowerCase().includes(q));
      if (!matchesSearch && !subItemsMatch) return null;

      const isSubExpanded = expandedSubModules[item.id] || (q !== '' && subItemsMatch);
      const hasActiveChild = allowedItems.some(sub => selectedTable === sub.id || (sub.path && window.location.pathname.startsWith(sub.path)));
      const isActiveFolder = activeSubmenu === item.id || hasActiveChild;

      return (
        <div key={item.id}>
          <div 
            className={`sub-submenu-header ${isSubExpanded ? 'open' : ''} ${isActiveFolder ? 'active' : ''}`} 
            onClick={() => toggleSubModule(item.id)}
          >
            <span className="menu-text">{item.name}</span>
            {allowedItems.length > 0 && (
              <span className="menu-badge" style={{ marginRight: '8px' }}>{allowedItems.length}</span>
            )}
            <ChevronRight size={14} className={`menu-arrow ${isSubExpanded ? 'open' : ''}`} />
          </div>
          
          <div className={`sidebar-submenu ${isSubExpanded ? 'open' : ''}`}>
            {allowedItems.map(sub => {
              if (q !== '' && !sub.name.toLowerCase().includes(q)) return null;
              
              if (sub.path) {
                return (
                  <Link
                    key={sub.id}
                    to={sub.path}
                    className={`sub-submenu-item ${selectedTable === sub.id || (window.location.pathname === sub.path) ? 'active' : ''}`}
                    style={{ textDecoration: 'none' }}
                    onClick={() => {
                      if (onSelectTable) onSelectTable(null);
                    }}
                  >
                    <span className="menu-text">{sub.name}</span>
                  </Link>
                );
              }

              return (
                <div
                  key={sub.id}
                  className={`sub-submenu-item ${selectedTable === sub.id ? 'active' : ''}`}
                  onClick={(e) => handleTableClick(e, sub.id, sub.isPlaceholder, sub.name)}
                >
                  <span className="menu-text">{sub.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (!matchesSearch) return null;

    // Direct link items
    if (item.path) {
      return (
        <Link 
          key={item.id} 
          to={item.path} 
          className={`submenu-item ${window.location.pathname === item.path ? 'active' : ''}`}
          style={{ textDecoration: 'none' }}
          onClick={() => {
            if (onSelectTable) onSelectTable(null);
          }}
        >
          {item.name}
        </Link>
      );
    }

    return (
      <div
        key={item.id}
        className={`submenu-item ${selectedTable === item.id ? 'active' : ''}`}
        onClick={(e) => handleTableClick(e, item.id, item.isPlaceholder, item.name)}
      >
        <span className="menu-text" style={{ fontStyle: item.isPlaceholder ? 'italic' : 'normal' }}>
          {item.name}
        </span>
      </div>
    );
  };

  return (
    <aside className={`sidebar-container ${open ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
          <a 
            href="#" 
            className={`sidebar-brand ${isCollapsed ? 'collapsed' : ''}`}
            onClick={(e) => { e.preventDefault(); navigate('/'); onNavigateHome(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            {isCollapsed ? (
              <img src="/favicon.png" alt="AgroPaccioli" style={{ height: '32px', width: '32px' }} />
            ) : (
              <>
                <img src="/logo-agropaccioli-cropped.png" alt="Logo" style={{ height: '36px', objectFit: 'contain' }} />
                <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>AGROPACCIOLI</span>
              </>
            )}
          </a>
        <button 
          className="sidebar-toggle-btn" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {!isCollapsed && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 30px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {/* Dashboard Home */}
        <div 
          className={`sidebar-menu-item ${!selectedTable && (window.location.pathname === '/' || window.location.pathname === '/index.html') ? 'active' : ''}`}
          onClick={() => { navigate('/'); onNavigateHome(); }}
        >
          <span className="menu-icon"><Activity size={20} /></span>
          <span className="menu-text">Dashboard</span>
          <div className="sidebar-tooltip">Dashboard</div>
        </div>

        {navigationTree.map((group) => {
          if (!hasAccess(group)) return null;

          // Check if group matches search
          const hasMatchingItems = group.items.some(item => {
            if (item.name.toLowerCase().includes(q)) return true;
            if (item.isSubmenu) {
              return item.items.some(sub => sub.name.toLowerCase().includes(q));
            }
            return false;
          });

          if (q !== '' && !group.name.toLowerCase().includes(q) && !hasMatchingItems) {
            return null;
          }

          const isExpanded = expandedModules[group.id] || (q !== '' && hasMatchingItems);

          // Calculate badge count
          let count = group.items.length;
          group.items.forEach(i => {
            if (i.isSubmenu) count += (i.items.length - 1);
          });

          return (
            <div key={group.id}>
              <div 
                className={`sidebar-menu-item ${isExpanded ? 'active' : ''}`}
                onClick={() => toggleModule(group.id)}
              >
                <span className="menu-icon">{group.icon}</span>
                <span className="menu-text">{group.name}</span>
                <span className="menu-badge">{count}</span>
                <ChevronRight size={16} className={`menu-arrow ${isExpanded ? 'open' : ''}`} />
                
                {/* Tooltip for collapsed mode */}
                <div className="sidebar-tooltip">{group.name}</div>
              </div>

              <div className={`sidebar-submenu ${isExpanded && !isCollapsed ? 'open' : ''}`}>
                {group.items.map(item => renderItem(item))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="sidebar-footer" style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 0' }}>
        <div 
          className="sidebar-menu-item" 
          onClick={() => {
            if(window.confirm('¿Seguro que deseas cerrar sesión?')) {
              logout();
            }
          }}
          style={{ color: '#ef4444' }}
        >
          <span className="menu-icon"><LogOut size={20} /></span>
          <span className="menu-text">Cerrar Sesión</span>
          <div className="sidebar-tooltip">Cerrar Sesión</div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
