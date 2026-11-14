import { Menu, app, shell, type MenuItemConstructorOptions } from 'electron';

const isMac = process.platform === 'darwin';

/**
 * The standard Mac menu, so undo, copy, paste and quit all behave normally.
 * The project-workflow actions arrive as trusted app-level callbacks (issue 32):
 * they forward one fixed action name to the renderer, they never carry site or
 * filesystem power of their own.
 */
export function buildMenu(
  options: {
    onNewProject?: () => void;
    onOpenProject?: () => void;
    onProjectHome?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
  } = {},
): Menu {
  const appMenu: MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
      ]
    : [];

  const fileItems: MenuItemConstructorOptions[] = [
    ...(options.onNewProject
      ? [
          {
            label: 'New Project…',
            accelerator: 'CmdOrCtrl+N',
            click: options.onNewProject,
          } as MenuItemConstructorOptions,
        ]
      : []),
    ...(options.onOpenProject
      ? [
          {
            label: 'Open Project…',
            accelerator: 'CmdOrCtrl+O',
            click: options.onOpenProject,
          } as MenuItemConstructorOptions,
        ]
      : []),
    ...(options.onProjectHome
      ? [
          {
            label: 'Project Home',
            accelerator: 'CmdOrCtrl+Shift+H',
            click: options.onProjectHome,
          } as MenuItemConstructorOptions,
        ]
      : []),
    { type: 'separator' },
    { role: 'close' },
  ];

  const template: MenuItemConstructorOptions[] = [
    ...appMenu,
    {
      label: 'File',
      submenu: fileItems,
    },
    {
      label: 'Edit',
      submenu: [
        ...(options.onUndo
          ? [
              {
                label: 'Undo',
                accelerator: 'CmdOrCtrl+Z',
                click: options.onUndo,
              } as MenuItemConstructorOptions,
            ]
          : [{ role: 'undo' } as MenuItemConstructorOptions]),
        ...(options.onRedo
          ? [
              {
                label: 'Redo',
                accelerator: 'CmdOrCtrl+Shift+Z',
                click: options.onRedo,
              } as MenuItemConstructorOptions,
            ]
          : [{ role: 'redo' } as MenuItemConstructorOptions]),
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Cauldron on GitHub',
          click: () => {
            void shell.openExternal('https://github.com/cre8tivoz/cauldron');
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
