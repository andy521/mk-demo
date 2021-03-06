import React from 'react'
import { Menu } from 'mk-component'
import { action as MetaAction, AppLoader } from 'mk-meta-engine'
import { fromJS } from 'immutable'
import config from './config'

class action {
    constructor(option) {
        this.metaAction = option.metaAction
        this.config = config.current
        this.webapi = this.config.webapi
    }

    onInit = ({ component, injections }) => {
        this.component = component
        this.injections = injections
        injections.reduce('init')

        this.load()
    }

    load = async () => {
        //网站中不存在login应用，那么就不做用户相关处理，正式环境应该不需要这段代码，仅为单应用运行使用
        if (!this.config.apps['mk-app-login']) {
            const user = { id: 1, mobile: '13334445556', nickname: '齐天大圣' }
            this.metaAction.context.set('currentUser', user)
            this.metaAction.sf('data.other.currentUser', fromJS(user))
            return
        }

        const response = await this.webapi.portal.init()
        if (response.user) {
            this.metaAction.context.set('currentUser', response.user)
            this.metaAction.sf('data.other.currentUser', fromJS(response.user))
        }
        else {
            this.metaAction.context.set('currentUser', undefined)
            if (this.component.props.onRedirect && this.config.goAfterLogout) {
                this.component.props.onRedirect(this.config.goAfterLogout)
            }
        }

        /*
        如果菜单从ajax获取，那么使用下面的方式
        if (this.webapi.getMenu) {
            const menu = await this.webapi.getMenu()
            this.injections.reduce('load', {menu})
        }*/
    }

    getLogo = () => this.config.logo

    getPhoto = () => require('./img/photo.png')

    getCurrentUser = () => this.metaAction.context.get('currentUser') || {}

    getMenuChildren = () => {
        const menu = this.metaAction.gf('data.menu').toJS()
        const loop = (children) => {
            const ret = []
            children.forEach(child => {

                if (!child.children) {
                    ret.push(<Menu.Item key={child.key}>{child.name}</Menu.Item>)
                }
                else {
                    ret.push(<Menu.SubMenu key={child.key} title={child.name}>{loop(child.children)}</Menu.SubMenu>)
                }
            })
            return ret
        }
        return loop(menu)
    }

    topMenuClick = async (e) => {
        switch (e.key) {
            case 'logout':
                if (this.component.props.onRedirect && this.config.goAfterLogout) {
                    await this.webapi.user.logout()
                    this.metaAction.context.set('currentUser', undefined)
                    this.component.props.onRedirect(this.config.goAfterLogout)
                }
                break;
            case 'github':
                window.open('https://www.github.com/ziaochina/mk-demo')
                break;
            case 'gitter':
                window.open('https://gitter.im/mk-js/mk-js?utm_source=share-link&utm_medium=link&utm_campaign=share-link')
                break;
            case 'mySetting':
                this.injections.reduce('setContent', 'mk-app-my-setting', {})
                break;
        }
    }


    menuClick = (e) => {

        const menu = this.metaAction.gf('data.menu').toJS()
        const find = (children) => {
            for (let child of children) {
                if (child.key == e.key) {
                    return child
                }

                if (child.children) {
                    let o = find(child.children)
                    if (o) return o
                }
            }
        }

        const hit = find(menu)
        if (hit) {
            this.injections.reduce('setContent', hit.appName, hit.appParams)
        }
    }

    setContent = (appName, appParams) => {
        this.injections.reduce('setContent', appName, appParams)
    }
}

export default function creator(option) {
    const metaAction = new MetaAction(option),
        o = new action({ ...option, metaAction }),
        ret = { ...metaAction, ...o }

    metaAction.config({ metaHandlers: ret })

    return ret
}