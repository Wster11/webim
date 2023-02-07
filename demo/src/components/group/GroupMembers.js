import React from "react";
import { connect } from "react-redux";
import {
  Card,
  Icon,
  Popconfirm,
  Table,
  Tooltip,
  Modal,
  Input,
  message
} from "antd";
import { withRouter } from "react-router-dom";
import _ from "lodash";
import { I18n } from "react-redux-i18n";
import GroupMemberActions from "@/redux/GroupMemberRedux";
import "./style/index.less";
import WebIM from "../../config/WebIM";

const PAGE_SIZE = 1;

const iconStyle = { fontSize: 16, marginRight: 15 };

class GroupMembers extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: false,
      nickName: "",
      currentNickName: "",
      current: 1 // 当前页数
    };
  }
  unListen = null;

  componentDidMount() {
    this.getUserAttrs();
    this.unListen = this.props.history.listen((location) => {
      if (this.props.location.pathname !== location.pathname) {
        setTimeout(() => {
          this.getUserAttrs();
          this.setState({
            current: 1
          });
        }, 0);
      }
    });
  }

  componentWillUnmount() {
    this.unListen && this.unListen();
  }

  getUserAttrs = async () => {
    const { roomId } = this.props;
    let res = await WebIM.conn.getMemberAttributes({
      userId: WebIM.conn.user,
      groupId: roomId,
      keys: ["nickName"]
    });
    this.setState({
      currentNickName: res.data.nickName
    });
  };

  onChange = ({ current }) => {
    const { roomId } = this.props;
    this.props.listGroupMemberAsync({
      groupId: roomId,
      pageNum: current,
      success: () => {
        this.setState({
          current
        });
      }
    });
  };

  setAdmin = (groupId, name) => this.props.setAdminAsync(groupId, name);

  removeAdmin = (groupId, name) => this.props.removeAdminAsync(groupId, name);

  mute = (groupId, name) => this.props.muteAsync(groupId, name);

  removeMute = (groupId, name) => this.props.removeMuteAsync(groupId, name);

  groupBlockSingle = (groupId, name) =>
    this.props.groupBlockSingleAsync(groupId, name);

  removeSingleGroupMember = (groupId, name) =>
    this.props.removeSingleGroupMemberAsync(groupId, name);

  showModal = () => {
    this.setState({
      visible: true
    });
  };

  hideModal = () => {
    this.setState({
      visible: false
    });
  };

  handleOk = ({ userId = "" }) => {
    const { nickName } = this.state;
    let opt = {
      groupId: this.props.roomId,
      userId,
      key: "nickName",
      value: nickName
    };
    WebIM.conn
      .setMemberAttribute(opt)
      .then((res) => {
        message.success("修改我的群昵称成功");
        this.setState({
          currentNickName: nickName,
          visible: false,
          nickName: ""
        });
      })
      .catch((e) => {
        message.error("修改我的群昵称失败");
      });
  };

  render() {
    const { login, roomId, groupMember, groupInfo } = this.props;
    const { visible, nickName, current } = this.state;
    // const memberActionMenu = (
    //     <Menu>
    //         <Menu.Item key="1">
    //             <Tooltip>
    //                 <Popconfirm title="确认设为管理员吗？" onConfirm={() => this.setAdmin(record.name)}>
    //                     <a href="#">设为管理</a>
    //                 </Popconfirm>
    //             </Tooltip>
    //         </Menu.Item>
    //     </Menu>
    // )
    let owner;
    const currentUser = _.get(login, "username", "");
    let isOwner = currentUser.toLowerCase() === groupInfo.owner;
    const members = _.get(groupMember, `${roomId}.byName`, []);
    const admins = _.get(groupMember, `${roomId}.admins`, []);
    const muted = _.get(groupMember, `${roomId}.muted`, []);
    const data = _.map(members, (val, key) => {
      const { affiliation, info, name, groupInfo } = val;
      const isAdmin = _.includes(admins, key);
      const isMuted = _.includes(muted, key);
      return {
        name: groupInfo?.nickName || info.nickname || val.name,
        key,
        affiliation,
        isAdmin,
        isMuted,
        id: name
      };
    }).slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
    const columns = [
      {
        title: "Name",
        key: "name",
        dataIndex: "name"
      },
      {
        title: "Action",
        key: "action",
        render: (text, record) => {
          // const isAdmin = _.includes(admins, currentUser)
          const canOperate =
            record.id !== currentUser && // self
            record.id !== owner && // owner
            (isOwner || _.includes(admins, currentUser));
          // return data.length > 0 && (isAdmin || (isOwner && owner !== record.id))
          const AdminIcons = (props) => {
            const { admins, record } = props;
            return _.includes(admins, record.id) ? (
              <Popconfirm
                title={I18n.t("confirm") + " " + I18n.t("removeAdmin")}
                onConfirm={() => this.removeAdmin(roomId, record.id)}
              >
                <Tooltip title={I18n.t("removeAdmin")} placement="left">
                  <Icon type="arrow-down" style={iconStyle} />
                </Tooltip>
              </Popconfirm>
            ) : (
              <Popconfirm
                title={I18n.t("confirm") + " " + I18n.t("setAdmin")}
                onConfirm={() => this.setAdmin(roomId, record.id)}
              >
                <Tooltip title={I18n.t("setAdmin")} placement="left">
                  <Icon type="arrow-up" style={iconStyle} />
                </Tooltip>
              </Popconfirm>
            );
          };
          const MuteIcons = (props) => {
            const { muted, record } = props;
            return _.hasIn(muted, ["byName", record.id]) ? (
              <Popconfirm
                title={I18n.t("confirm") + " " + I18n.t("removeMute")}
                onConfirm={() => this.removeMute(roomId, record.id)}
              >
                <Tooltip title={I18n.t("removeMute")} placement="left">
                  <Icon type="unlock" style={iconStyle} />
                </Tooltip>
              </Popconfirm>
            ) : (
              <Popconfirm
                title={I18n.t("confirm") + " " + I18n.t("mute")}
                onConfirm={() => this.mute(roomId, record.id)}
              >
                <Tooltip title={I18n.t("mute")} placement="left">
                  <Icon type="lock" style={iconStyle} />
                </Tooltip>
              </Popconfirm>
            );
          };
          return data.length > 0 && canOperate ? (
            <span className="fr">
              {record.isAdmin}

              {/* <Dropdown overlay={memberActionMenu} trigger={['click']}><Icon type="info-circle-o" /></Dropdown> */}
              <AdminIcons record={record} admins={admins} />
              <MuteIcons record={record} muted={muted} />
              <Popconfirm
                title={I18n.t("confirm") + " " + I18n.t("groupBlockSingle")}
                onConfirm={() => this.groupBlockSingle(roomId, record.id)}
              >
                <Tooltip title={I18n.t("groupBlockSingle")} placement="left">
                  <Icon type="frown-o" style={iconStyle} />
                </Tooltip>
              </Popconfirm>
              <Popconfirm
                title={
                  I18n.t("confirm") + " " + I18n.t("removeSingleGroupMember")
                }
                onConfirm={() =>
                  this.removeSingleGroupMember(roomId, record.id)
                }
              >
                <Tooltip
                  title={I18n.t("removeSingleGroupMember")}
                  placement="left"
                >
                  <Icon type="usergroup-delete" style={iconStyle} />
                </Tooltip>
              </Popconfirm>
            </span>
          ) : null;
        }
      }
    ];
    return (
      <>
        <Card
          title="我在群里的昵称"
          extra={
            <div
              onClick={() => {
                this.showModal();
              }}
              style={{ cursor: "pointer" }}
            >
              <Icon type="edit" />
            </div>
          }
        >
          <span>{this.state.currentNickName} </span>
          <Modal
            visible={visible}
            onCancel={this.hideModal}
            cancelText="取消"
            okText="确认"
            title="编辑我的群昵称"
            onOk={() => {
              this.handleOk({ userId: currentUser });
            }}
          >
            <Input
              value={nickName}
              onChange={(e) => {
                this.setState({ nickName: e.target.value });
              }}
              placeholder="请输入群昵称"
            ></Input>
          </Modal>
        </Card>
        <Card
          title={I18n.t("members")}
          bordered={false}
          noHovering={true}
          className="group-member-wrapper"
        >
          <Table
            columns={columns}
            dataSource={data}
            showHeader={false}
            onChange={this.onChange}
            pagination={{
              current,
              pageSize: PAGE_SIZE,
              total: groupInfo.membersTotal
            }}
            scroll={{ y: 300 }}
            className="group-member-list"
          />
        </Card>
      </>
    );
  }
}

export default connect(
  ({ entities, login }) => ({
    login,
    groupMember: entities.groupMember,
    groupInfo: entities.group
  }),
  (dispatch) => ({
    listGroupMemberAsync: (opt) =>
      dispatch(GroupMemberActions.listGroupMemberAsync(opt)),
    setAdminAsync: (groupId, name) =>
      dispatch(GroupMemberActions.setAdminAsync(groupId, name)),
    removeAdminAsync: (groupId, name) =>
      dispatch(GroupMemberActions.removeAdminAsync(groupId, name)),
    muteAsync: (groupId, name) =>
      dispatch(GroupMemberActions.muteAsync(groupId, name)),
    removeMuteAsync: (groupId, name) =>
      dispatch(GroupMemberActions.removeMuteAsync(groupId, name)),
    groupBlockSingleAsync: (groupId, name) =>
      dispatch(GroupMemberActions.groupBlockSingleAsync(groupId, name)),
    removeSingleGroupMemberAsync: (groupId, name) =>
      dispatch(GroupMemberActions.removeSingleGroupMemberAsync(groupId, name))
  })
)(withRouter(GroupMembers));
